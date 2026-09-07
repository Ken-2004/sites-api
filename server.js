require("dotenv").config();

const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const jwt = require("jsonwebtoken");

const dataService = require("./data-service");
const userService = require("./user-service");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// JWT Strategy setup
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, (jwt_payload, done) => {
  if (jwt_payload) {
    return done(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName
    });
  } else {
    return done(null, false);
  }
}));

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get("/", (req, res) => {
  res.json({ message: "Sites API is running" });
});

// --- User routes ---

app.post("/api/user/login", async (req, res) => {
  try {
    const user = await userService.checkUser(req.body);
    const payload = { _id: user._id, userName: user.userName };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.json({ message: "login successful", token });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

app.post("/api/user/register", async (req, res) => {
  try {
    const msg = await userService.registerUser(req.body);
    res.json({ message: msg });
  } catch (err) {
    res.status(422).json({ message: err });
  }
});

app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const favourites = await userService.getFavourites(req.user._id);
      res.json(favourites);
    } catch (err) {
      res.status(422).json({ message: err });
    }
  }
);

app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const favourites = await userService.addFavourite(req.user._id, req.params.id);
      res.json(favourites);
    } catch (err) {
      res.status(422).json({ message: err });
    }
  }
);

app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const favourites = await userService.removeFavourite(req.user._id, req.params.id);
      res.json(favourites);
    } catch (err) {
      res.status(422).json({ message: err });
    }
  }
);

// --- Sites routes (GET public, POST/PUT/DELETE protected) ---

app.get("/api/sites", async (req, res) => {
  try {
    const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;
    const sites = await dataService.getAllSites(
      page, perPage, name, description, year, town, provinceOrTerritoryCode
    );
    res.json(sites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/sites/:id", async (req, res) => {
  try {
    const site = await dataService.getSiteById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.json(site);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

app.post(
  "/api/sites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const newSite = await dataService.addNewSite(req.body);
      res.status(201).json(newSite);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

app.put(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const result = await dataService.updateSiteById(req.body, req.params.id);
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.json({ message: "Site updated successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

app.delete(
  "/api/sites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const result = await dataService.deleteSiteById(req.params.id);
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

Promise.all([dataService.initialize(), userService.connect()])
  .then(() => {
    console.log("Services initialized");
  })
  .catch((err) => {
    console.log("Service init error:", err);
  });

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(HTTP_PORT, () => {
    console.log(`Server listening on: ${HTTP_PORT}`);
  });
}
