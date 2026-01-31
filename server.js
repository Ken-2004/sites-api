/********************************************************************************
*  WEB422 – Assignment 1 
* 
*  I declare that this assignment is my own work in accordance with Seneca's
*  Academic Integrity Policy:
* 
*  https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
*  Name: Harsh Prajapati Student ID: 150763233 Date: 1/2/2026
*
*  Published URL (of the API) on Vercel:  ________________________
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

// Test route required by assignment
app.get("/", (req, res) => {
  res.json({
    message: "API Listening",
    term: "Winter 2026",
    student: "Harsh Prajapati",
    learnID: "YOUR_LEARN_ID_HERE"
  });
});

// POST /api/sites - add new site
app.post("/api/sites", async (req, res) => {
  try {
    const newSite = await dataService.addNewSite(req.body);
    res.status(201).json(newSite);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sites - paging + optional filters
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

// GET /api/sites/:id
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

// PUT /api/sites/:id
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

// DELETE /api/sites/:id
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

// 404 middleware (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Initialize database, then start server
dataService.initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server listening on: ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
