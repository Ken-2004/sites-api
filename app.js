const express = require("express");
const cors = require("cors");
const { Passport } = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const jwt = require("jsonwebtoken");

const dataService = require("./data-service");
const userService = require("./user-service");
const { AppError } = require("./errors");
const {
  validateLogin,
  validateObjectId,
  validatePagination,
  validateRegistration,
  validateSite
} = require("./middleware/validation");

function errorBody(message) {
  return { error: { message } };
}

function securityHeaders(req, res, next) {
  res.set({
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
  next();
}

function createApp({ jwtSecret, corsOrigin = "*" }) {
  if (!jwtSecret) throw new Error("A JWT secret is required to configure the application");

  const app = express();
  const passport = new Passport();
  const auth = passport.authenticate("jwt", { session: false, failWithError: true });

  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret
  }, (payload, done) => done(null, payload ? {
    _id: payload._id,
    userName: payload.userName
  } : false)));

  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());
  app.use(passport.initialize());

  app.get("/", (req, res) => res.json({ message: "Sites API is running" }));

  app.post("/api/user/login", validateLogin, async (req, res, next) => {
    try {
      const user = await userService.checkUser(req.body);
      const payload = { _id: user._id, userName: user.userName };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
      res.json({ message: "login successful", token });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/user/register", validateRegistration, async (req, res, next) => {
    try {
      const message = await userService.registerUser(req.body);
      res.status(201).json({ message });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user/favourites", auth, async (req, res, next) => {
    try {
      res.json(await userService.getFavourites(req.user._id));
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/user/favourites/:id", auth, validateObjectId, async (req, res, next) => {
    try {
      res.json(await userService.addFavourite(req.user._id, req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/user/favourites/:id", auth, validateObjectId, async (req, res, next) => {
    try {
      res.json(await userService.removeFavourite(req.user._id, req.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sites", validatePagination, async (req, res, next) => {
    try {
      const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;
      res.json(await dataService.getAllSites(
        page, perPage, name, description, year, town, provinceOrTerritoryCode
      ));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/sites/:id", validateObjectId, async (req, res, next) => {
    try {
      const site = await dataService.getSiteById(req.params.id);
      if (!site) return res.status(404).json(errorBody("Site not found"));
      return res.json(site);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/sites", auth, validateSite, async (req, res, next) => {
    try {
      res.status(201).json(await dataService.addNewSite(req.body));
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/sites/:id", auth, validateObjectId, validateSite, async (req, res, next) => {
    try {
      const result = await dataService.updateSiteById(req.body, req.params.id);
      if (result.matchedCount === 0) return res.status(404).json(errorBody("Site not found"));
      return res.json({ message: "Site updated successfully" });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/sites/:id", auth, validateObjectId, async (req, res, next) => {
    try {
      const result = await dataService.deleteSiteById(req.params.id);
      if (result.deletedCount === 0) return res.status(404).json(errorBody("Site not found"));
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => res.status(404).json(errorBody("Route not found")));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error && error.name === "AuthenticationError" && !(error instanceof AppError)) {
      return res.status(401).json(errorBody("Authentication required"));
    }
    if (error && error.type === "entity.parse.failed") {
      return res.status(400).json(errorBody("Malformed JSON request"));
    }
    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = status >= 500 ? "An unexpected error occurred" : error.message;
    return res.status(status).json(errorBody(message));
  });

  return app;
}

module.exports = { createApp };
