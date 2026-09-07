const mongoose = require("mongoose");
const siteSchema = require("./modules/siteSchema");

let Site = null;
let initPromise = null;

async function ensureInitialized() {
  if (Site) return;

  if (!initPromise) {
    const mongoDBConnectionString = process.env.MONGO_URL;

    if (!mongoDBConnectionString) {
      throw new Error("MONGO_URL is required to initialize the site service");
    }

    initPromise = mongoose.createConnection(mongoDBConnectionString).asPromise()
      .then((db) => {
        Site = db.model("sites", siteSchema);
      })
      .catch((error) => {
        initPromise = null;
        throw error;
      });
  }

  await initPromise;
}

module.exports.initialize = function () {
  return ensureInitialized();
};

module.exports.addNewSite = async function (data) {
  await ensureInitialized();
  const newSite = new Site(data);
  await newSite.save();
  return newSite;
};

module.exports.getAllSites = async function (
  page,
  perPage,
  name,
  description,
  year,
  town,
  provinceOrTerritoryCode
) {
  await ensureInitialized();

  let findBy = {};

  if (name) {
    findBy = { siteName: { $regex: name, $options: "i" } };
  }
  if (description) {
    findBy = { ...findBy, description: { $regex: description, $options: "i" } };
  }
  if (year) {
    findBy = { ...findBy, "dates.year": Number(year) };
  }
  if (town) {
    findBy = { ...findBy, "location.town": { $regex: town, $options: "i" } };
  }
  if (provinceOrTerritoryCode) {
    findBy = { ...findBy, "provinceOrTerritory.code": provinceOrTerritoryCode };
  }

  return Site.find(findBy)
    .sort({ siteName: 1 })
    .skip((Number(page) - 1) * Number(perPage))
    .limit(Number(perPage))
    .exec();
};

module.exports.getSiteById = async function (id) {
  await ensureInitialized();
  return Site.findById(id).exec();
};

module.exports.updateSiteById = async function (data, id) {
  await ensureInitialized();
  return Site.updateOne({ _id: id }, { $set: data }, { runValidators: true }).exec();
};

module.exports.deleteSiteById = async function (id) {
  await ensureInitialized();
  return Site.deleteOne({ _id: id }).exec();
};
