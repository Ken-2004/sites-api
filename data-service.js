const mongoose = require("mongoose");
const siteSchema = require("./modules/siteSchema");

let Site = null;
let initPromise = null;

function ensureInitialized() {
  if (Site) return Promise.resolve();

  if (!initPromise) {
    const mongoDBConnectionString = process.env.MONGO_URL;

    if (!mongoDBConnectionString) {
      return Promise.reject(
        new Error(
          "MONGO_URL is missing. Make sure it exists in .env (local) and Vercel Environment Variables."
        )
      );
    }

    initPromise = new Promise((resolve, reject) => {
      const db = mongoose.createConnection(mongoDBConnectionString);

      db.on("error", (err) => {
        reject(err);
      });

      db.once("open", () => {
        Site = db.model("sites", siteSchema);
        resolve();
      });
    });
  }

  return initPromise;
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

  if (+page && +perPage) {
    return Site.find(findBy)
      .sort({ siteName: 1 })
      .skip((page - 1) * +perPage)
      .limit(+perPage)
      .exec();
  }

  return Promise.reject(
    new Error("page and perPage query parameters must be valid numbers")
  );
};

module.exports.getSiteById = async function (id) {
  await ensureInitialized();
  return Site.findById(id).exec();
};

module.exports.updateSiteById = async function (data, id) {
  await ensureInitialized();
  return Site.updateOne({ _id: id }, { $set: data }).exec();
};

module.exports.deleteSiteById = async function (id) {
  await ensureInitialized();
  return Site.deleteOne({ _id: id }).exec();
};
