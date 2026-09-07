const request = require("supertest");

jest.mock("../data-service", () => ({
  addNewSite: jest.fn(), deleteSiteById: jest.fn(), getAllSites: jest.fn(),
  getSiteById: jest.fn(), updateSiteById: jest.fn()
}));
jest.mock("../user-service", () => ({
  addFavourite: jest.fn(), checkUser: jest.fn(), getFavourites: jest.fn(),
  registerUser: jest.fn(), removeFavourite: jest.fn()
}));

const dataService = require("../data-service");
const userService = require("../user-service");
const { ConflictError } = require("../errors");
const { createApp } = require("../app");
const app = createApp({ jwtSecret: "smoke-test-only-secret" });
const id = "507f1f77bcf86cd799439011";
const site = {
  siteName: "Harbour landmark", description: "A coastal historic site",
  dates: [{ year: "1900", type: "Established" }], designated: 1950,
  image: "https://example.com/site.jpg",
  location: { town: "Halifax", latitude: 44.65, longitude: -63.57 },
  provinceOrTerritory: { code: "NS", name: "Nova Scotia", type: "Province",
    region: "Atlantic", capital: "Halifax" }
};

beforeEach(() => jest.resetAllMocks());

test("API smoke: health, register, login, site CRUD, and favourites over HTTP", async () => {
  await request(app).get("/").expect(200);
  const credentials = { userName: "smoke-user", password: "smoke-password" };
  userService.registerUser.mockResolvedValue("User smoke-user successfully registered");
  await request(app).post("/api/user/register")
    .send({ ...credentials, password2: credentials.password }).expect(201);
  userService.checkUser.mockResolvedValue({ _id: id, userName: credentials.userName });
  const login = await request(app).post("/api/user/login").send(credentials).expect(200);
  const authorization = `Bearer ${login.body.token}`;

  dataService.addNewSite.mockResolvedValue({ _id: id, ...site });
  const created = await request(app).post("/api/sites").set("Authorization", authorization)
    .send(site).expect(201);
  expect(created.body._id).toBe(id);
  expect(dataService.addNewSite).toHaveBeenCalledWith(site);

  dataService.getAllSites.mockResolvedValue([created.body]);
  const listed = await request(app).get("/api/sites?page=1&perPage=10&town=Halifax").expect(200);
  expect(listed.body).toEqual([created.body]);
  dataService.getSiteById.mockResolvedValue(created.body);
  await request(app).get(`/api/sites/${id}`).expect(200, created.body);

  dataService.updateSiteById.mockResolvedValue({ matchedCount: 1 });
  await request(app).put(`/api/sites/${id}`).set("Authorization", authorization)
    .send({ siteName: "Updated landmark" }).expect(200);
  expect(dataService.updateSiteById).toHaveBeenCalledWith({ siteName: "Updated landmark" }, id);

  userService.getFavourites.mockResolvedValue([]);
  await request(app).get("/api/user/favourites").set("Authorization", authorization).expect(200, []);
  userService.addFavourite.mockResolvedValue([id]);
  await request(app).put(`/api/user/favourites/${id}`)
    .set("Authorization", authorization).expect(200, [id]);
  expect(userService.addFavourite).toHaveBeenCalledWith(id, id);
  userService.removeFavourite.mockResolvedValue([]);
  await request(app).delete(`/api/user/favourites/${id}`)
    .set("Authorization", authorization).expect(200, []);

  dataService.deleteSiteById.mockResolvedValue({ deletedCount: 1 });
  const deleted = await request(app).delete(`/api/sites/${id}`)
    .set("Authorization", authorization).expect(204);
  expect(deleted.text).toBe("");
});

test("returns a conflict when registering a duplicate username", async () => {
  userService.registerUser.mockRejectedValue(new ConflictError("Username is already in use"));
  await request(app).post("/api/user/register")
    .send({ userName: "duplicate", password: "long-password", password2: "long-password" })
    .expect(409, { error: { message: "Username is already in use" } });
});

test.each([
  ["put", "updateSiteById", { matchedCount: 0 }],
  ["delete", "deleteSiteById", { deletedCount: 0 }]
])("returns 404 for a missing site on %s", async (method, service, result) => {
  userService.checkUser.mockResolvedValue({ _id: id, userName: "smoke-user" });
  const login = await request(app).post("/api/user/login")
    .send({ userName: "smoke-user", password: "smoke-password" });
  dataService[service].mockResolvedValue(result);
  await request(app)[method](`/api/sites/${id}`)
    .set("Authorization", `Bearer ${login.body.token}`).send({ siteName: "Missing" })
    .expect(404, { error: { message: "Site not found" } });
});
