const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../data-service", () => ({ addNewSite: jest.fn(), getAllSites: jest.fn() }));
jest.mock("../user-service", () => ({}));
const dataService = require("../data-service");
const { createApp } = require("../app");
const secret = "validation-test-only-secret";
const app = createApp({ jwtSecret: secret });
const token = jwt.sign({ _id: "507f1f77bcf86cd799439011" }, secret, { expiresIn: "1h" });

beforeEach(() => jest.resetAllMocks());

test.each([
  [{ dates: {} }, "dates must be an array"],
  [{ dates: [null] }, "dates[0] must be an object"],
  [{ dates: [{ year: 1900 }] }, "dates[0].year must be a string"],
  [{ dates: [{ type: 12 }] }, "dates[0].type must be a string"],
  [{ location: [] }, "location must be an object"],
  [{ provinceOrTerritory: null }, "provinceOrTerritory must be an object"],
  [{ provinceOrTerritory: { code: 12 } }, "provinceOrTerritory.code must be a string"],
  [{ designated: "1900" }, "designated must be a number"]
])("rejects invalid nested site data %j", async (body, detail) => {
  const response = await request(app).post("/api/sites")
    .set("Authorization", `Bearer ${token}`).send(body);
  expect(response.status).toBe(400);
  expect(response.body.error.details).toContain(detail);
  expect(dataService.addNewSite).not.toHaveBeenCalled();
});

test.each(["", "?page=1", "?page=1.5&perPage=10", "?page=1&perPage=0", "?page=x&perPage=5"])(
  "rejects missing or invalid pagination %s", async (query) => {
    await request(app).get(`/api/sites${query}`).expect(400);
    expect(dataService.getAllSites).not.toHaveBeenCalled();
  }
);

test.each(["put", "delete"])("rejects invalid favourite IDs on %s", async (method) => {
  await request(app)[method]("/api/user/favourites/invalid")
    .set("Authorization", `Bearer ${token}`).expect(400);
});
