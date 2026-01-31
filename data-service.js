const mongoose = require("mongoose");
const siteSchema = require("./modules/siteSchema");

let mongoDBConnectionString = process.env.MONGO_URL;

let Site;


module.exports.initialize = function () {
  return new Promise(function (resolve, reject) {
      const db = mongoose.createConnection(mongoDBConnectionString);

      db.on('error', err => {
          reject(err);
      });

      db.once('open', () => {
          Site = db.model("sites", siteSchema);
          // User = db.model("users", userSchema);
          resolve();
      });
  });
};

module.exports.addNewSite = async function (data)  {
  const newSite = new Site(data);
  await newSite.save();
  return newSite;
}

module.exports.getAllSites = async function (page, perPage, name, description, year, town, provinceOrTerritoryCode) {
  let findBy = {};
  if (name) {
    findBy = { "siteName": { "$regex": name, "$options": "i" } }; // contains, case insensitive
  } 
  if (description) {
    findBy = { ...findBy, "description": { "$regex": description, "$options": "i" } }; // contains, case insensitive
  } 
  if (year) {
    findBy = { ...findBy,  "dates.year": year };
  } 
  if (town) {
    findBy = { ...findBy, "location.town": { "$regex": town, "$options": "i" } }; // contains, case insensitive
  } 
  if (provinceOrTerritoryCode) {
    findBy = { ...findBy, "provinceOrTerritory.code": provinceOrTerritoryCode }; 
  } ;

  console.log("findBy:", findBy);

  if (+page && +perPage) {
    return Site.find(findBy).sort({ siteName: 1 }).skip((page - 1) * +perPage).limit(+perPage).exec();
  }

  return Promise.reject(new Error('page and perPage query parameters must be valid numbers'));
}

module.exports.getSiteById = async function (id) {
  return Site.findById(id).exec();
  // return Site.findOne({ _id: id }).exec(); // both work
}

module.exports.updateSiteById = async function (data, id) {
  return Site.updateOne({ _id: id }, { $set: data }).exec();
}

module.exports.deleteSiteById = async function (id) {
  return Site.deleteOne({ _id: id }).exec();
}
