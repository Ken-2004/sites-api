/********************************************************************************
*  WEB422 – Assignment 1 
* 
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
*  Name: Harsh Prajapati Student ID: 150763233 Date: 05-02-2026
*
*  Published URL (of the API) on Vercel: https://sites-api-five.vercel.app/
*
********************************************************************************/

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const dataService = require("./data-service");

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Listening",
    term: "Winter 2026",
    student: "Harsh Prajapati",
    learnID: "hnprajapati2"
  });
});

app.post("/api/sites", async (req, res) => {
  try {
    const newSite = await dataService.addNewSite(req.body);
    res.status(201).json(newSite);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/sites", async (req, res) => {
  try {
    const { page, perPage, name, description, year, town, provinceOrTerritoryCode } = req.query;

    const sites = await dataService.getAllSites(
      page,
      perPage,
      name,
      description,
      year,
      town,
      provinceOrTerritoryCode
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

app.put("/api/sites/:id", async (req, res) => {
  try {
    const result = await dataService.updateSiteById(req.body, req.params.id);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json({ message: "Site updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/sites/:id", async (req, res) => {
  try {
    const result = await dataService.deleteSiteById(req.params.id);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


dataService.initialize()
  .then(() => {
    console.log("Data service initialized");
  })
  .catch((err) => {
    console.log("Data service init error:", err);
  });

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(HTTP_PORT, () => {
    console.log(`Server listening on: ${HTTP_PORT}`);
  });
}
