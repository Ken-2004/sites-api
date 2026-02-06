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
  siteName: String,
  description: String,
  dates: [dateSchema], 
  designated: Number,
  image: String,
  location: locationSchema,
  provinceOrTerritory: provinceOrTerritorySchema,
});

module.exports = siteSchema;