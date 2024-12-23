const mongoose = require('mongoose');

const oddsapiSchema = new mongoose.Schema({
    apiKey: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OddsAPI', oddsapiSchema);
