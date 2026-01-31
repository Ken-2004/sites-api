const mongoose = require('mongoose');

const dateSchema = new mongoose.Schema({
  year: String,
  type: String,
});

const locationSchema = new mongoose.Schema({
  town: String,
  latitude: Number,
  longitude: Number,
});

const provinceOrTerritorySchema = new mongoose.Schema({
  code: String,
  name: String,
  type: String,
  region: String,
  capital: String,
});

const siteSchema = new mongoose.Schema({
  // _id: String, // Don't use this for the automatically generated _id ie. PK Objectid('.....') !!!
  siteName: String,
  description: String,
  dates: [dateSchema], // [{ year: String, type: String }],
  designated: Number,
  image: String,
  location: locationSchema, // { town: String, latitude: Number, longitude: Number },
  provinceOrTerritory: provinceOrTerritorySchema, // { code: String, name: String, type: String, region: String, capital: String },
});

module.exports = siteSchema;