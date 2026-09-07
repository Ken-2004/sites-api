const mongoose = require('mongoose');

const dateSchema = new mongoose.Schema({
  year: String,
  type: String,
}, { _id: false });

const locationSchema = new mongoose.Schema({
  town: String,
  latitude: Number,
  longitude: Number,
}, { _id: false });

const provinceOrTerritorySchema = new mongoose.Schema({
  code: String,
  name: String,
  type: String,
  region: String,
  capital: String,
}, { _id: false });

const siteSchema = new mongoose.Schema({
  siteName: String,
  description: String,
  dates: {
    type: [dateSchema],
    default: []
  },
  designated: Number,
  image: String,
  location: locationSchema,
  provinceOrTerritory: provinceOrTerritorySchema,
});

module.exports = siteSchema;
