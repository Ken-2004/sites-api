process.env.NODE_ENV = "test";

const jwt = require("jsonwebtoken");
const request = require("supertest");

jest.mock("../data-service", () => ({
  addNewSite: jest.fn(),
  deleteSiteById: jest.fn(),
  getAllSites: jest.fn(),
  getSiteById: jest.fn(),
  updateSiteById: jest.fn()
}));

jest.mock("../user-service", () => ({
  addFavourite: jest.fn(),
  checkUser: jest.fn(),
  getFavourites: jest.fn(),
  registerUser: jest.fn(),
  removeFavourite: jest.fn()
}));

const dataService = require("../data-service");
const userService = require("../user-service");
const { AuthenticationError } = require("../errors");
const { createApp } = require("../app");

const JWT_SECRET = "test-only-secret-that-is-not-a-production-credential";
const VALID_ID = "507f1f77bcf86cd799439011";
const app = createApp({ jwtSecret: JWT_SECRET });

function tokenFor(user = { _id: VALID_ID, userName: "portfolio-user" }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

beforeEach(() => jest.clearAllMocks());

describe("general routes", () => {
  test("returns the health response", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Sites API is running" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  test("returns a structured 404 for an unknown route", async () => {
    const response = await request(app).get("/not-a-route");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: "Route not found" } });
  });

  test("returns a safe 400 response for malformed JSON", async () => {
    const response = await request(app)
      .post("/api/user/login")
      .set("Content-Type", "application/json")
      .send('{"userName":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { message: "Malformed JSON request" } });
  });
});

describe("request and authentication boundaries", () => {
  test.each(["/api/user/register", "/api/user/login", "/api/sites"])(
    "rejects an absent JSON body at %s", async (path) => {
      const response = await request(app).post(path)
        .set("Authorization", `Bearer ${tokenFor()}`);
      expect(response.status).toBe(400);
      expect(response.body.error.details).toContain("body must be a JSON object");
    }
  );

  test.each(["/api/user/register", "/api/user/login", "/api/sites"])(
    "rejects an array body at %s", async (path) => {
      const response = await request(app).post(path)
        .set("Authorization", `Bearer ${tokenFor()}`).send([]);
      expect(response.status).toBe(400);
    }
  );

  test("keeps JWT strategies isolated between application instances", async () => {
    const secondApp = createApp({ jwtSecret: "another-test-only-secret" });
    userService.getFavourites.mockResolvedValue([]);
    const token = tokenFor();
    const original = await request(app).get("/api/user/favourites")
      .set("Authorization", `Bearer ${token}`);
    const other = await request(secondApp).get("/api/user/favourites")
      .set("Authorization", `Bearer ${token}`);
    expect(original.status).toBe(200);
    expect(other.status).toBe(401);
  });

  test.each(["expired", "wrong signature", "malformed"])("rejects a %s token", async (kind) => {
    const token = kind === "expired"
      ? jwt.sign({ _id: VALID_ID }, JWT_SECRET, { expiresIn: -1 })
      : kind === "wrong signature" ? jwt.sign({ _id: VALID_ID }, "wrong-test-secret") : "invalid";
    const response = await request(app).get("/api/user/favourites")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(userService.getFavourites).not.toHaveBeenCalled();
  });

  test("applies the configured browser origin on preflight", async () => {
    const corsApp = createApp({ jwtSecret: JWT_SECRET, corsOrigin: "https://client.example" });
    const response = await request(corsApp).options("/api/sites")
      .set("Origin", "https://client.example")
      .set("Access-Control-Request-Method", "POST");
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://client.example");
  });

  test("hides internal service errors", async () => {
    dataService.getAllSites.mockRejectedValue(new Error("internal database details"));
    const response = await request(app).get("/api/sites?page=1&perPage=10");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { message: "An unexpected error occurred" } });
  });

  test("rejects app creation without a signing secret", () => {
    expect(() => createApp({})).toThrow("A JWT secret is required");
  });
});

describe("authentication", () => {
  test("rejects invalid registration input", async () => {
    const response = await request(app).post("/api/user/register").send({
      userName: " ", password: "short", password2: "different"
    });
    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      "userName is required",
      "password must be at least 8 characters long",
      "passwords must match"
    ]));
    expect(userService.registerUser).not.toHaveBeenCalled();
  });

  test("trims a valid registration username and returns 201", async () => {
    userService.registerUser.mockResolvedValue("User new-user successfully registered");
    const response = await request(app).post("/api/user/register").send({
      userName: "  new-user  ", password: "long-password", password2: "long-password"
    });
    expect(response.status).toBe(201);
    expect(userService.registerUser).toHaveBeenCalledWith(expect.objectContaining({
      userName: "new-user"
    }));
  });

  test("rejects incomplete login input", async () => {
    const response = await request(app).post("/api/user/login").send({ userName: "" });
    expect(response.status).toBe(400);
    expect(userService.checkUser).not.toHaveBeenCalled();
  });

  test("returns a one-hour JWT after successful authentication", async () => {
    userService.checkUser.mockResolvedValue({ _id: VALID_ID, userName: "portfolio-user" });
    const response = await request(app).post("/api/user/login").send({
      userName: "portfolio-user", password: "long-password"
    });
    const payload = jwt.verify(response.body.token, JWT_SECRET);
    expect(response.status).toBe(200);
    expect(payload.exp - payload.iat).toBe(3600);
  });

  test("returns 401 without leaking details for invalid credentials", async () => {
    userService.checkUser.mockRejectedValue(new AuthenticationError());
    const response = await request(app).post("/api/user/login").send({
      userName: "portfolio-user", password: "wrong-password"
    });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { message: "Invalid username or password" } });
  });

  test("requires a token for the protected favourites route", async () => {
    const response = await request(app).get("/api/user/favourites");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { message: "Authentication required" } });
  });
});

describe("site routes", () => {
  test("rejects invalid pagination", async () => {
    const response = await request(app).get("/api/sites?page=0&perPage=101");
    expect(response.status).toBe(400);
    expect(dataService.getAllSites).not.toHaveBeenCalled();
  });

  test("keeps the paginated site list public", async () => {
    dataService.getAllSites.mockResolvedValue([{ _id: VALID_ID, siteName: "Example" }]);
    const response = await request(app).get("/api/sites?page=1&perPage=10");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  test("rejects a structurally invalid site ID", async () => {
    const response = await request(app).get("/api/sites/not-an-object-id");
    expect(response.status).toBe(400);
    expect(dataService.getSiteById).not.toHaveBeenCalled();
  });

  test("returns 404 for a nonexistent valid site ID", async () => {
    dataService.getSiteById.mockResolvedValue(null);
    const response = await request(app).get(`/api/sites/${VALID_ID}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: "Site not found" } });
  });

  test.each([
    ["post", "/api/sites"],
    ["put", `/api/sites/${VALID_ID}`],
    ["delete", `/api/sites/${VALID_ID}`]
  ])("requires authentication for %s %s", async (method, path) => {
    const response = await request(app)[method](path).send({ siteName: "Example" });
    expect(response.status).toBe(401);
  });

  test("validates site field types before creating a site", async () => {
    const response = await request(app)
      .post("/api/sites")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ siteName: 42, location: { latitude: "north" } });
    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(expect.arrayContaining([
      "siteName must be a string",
      "location.latitude must be a number"
    ]));
  });
});
