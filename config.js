const REQUIRED_ENVIRONMENT_VARIABLES = ["MONGO_URL", "JWT_SECRET"];

function validateEnvironment(environment = process.env) {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (name) => !environment[name] || !environment[name].trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`
    );
  }

  const port = environment.PORT || "8080";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return {
    mongoUrl: environment.MONGO_URL,
    jwtSecret: environment.JWT_SECRET,
    port: Number(port),
    corsOrigin: environment.CORS_ORIGIN || "*"
  };
}

module.exports = { validateEnvironment };
