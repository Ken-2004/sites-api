const { validateEnvironment } = require("../config");

describe("startup environment validation", () => {
  test("rejects whitespace-only configuration", () => {
    expect(() => validateEnvironment({ MONGO_URL: " ", JWT_SECRET: "\t" }))
      .toThrow("Missing required environment variables: MONGO_URL, JWT_SECRET");
  });

  test("accepts explicit port and CORS configuration", () => {
    expect(validateEnvironment({ MONGO_URL: "mongodb://localhost/test",
      JWT_SECRET: "test-secret", PORT: "3001", CORS_ORIGIN: "https://client.example" }))
      .toEqual(expect.objectContaining({ port: 3001, corsOrigin: "https://client.example" }));
  });

  test("reports all missing required variables without values", () => {
    expect(() => validateEnvironment({})).toThrow(
      "Missing required environment variables: MONGO_URL, JWT_SECRET"
    );
  });

  test("rejects an invalid port", () => {
    expect(() => validateEnvironment({
      MONGO_URL: "mongodb://localhost/test",
      JWT_SECRET: "test-secret",
      PORT: "70000"
    })).toThrow("PORT must be an integer between 1 and 65535");
  });

  test("applies safe local defaults", () => {
    expect(validateEnvironment({
      MONGO_URL: "mongodb://localhost/test",
      JWT_SECRET: "test-secret"
    })).toEqual(expect.objectContaining({ port: 8080, corsOrigin: "*" }));
  });
});
