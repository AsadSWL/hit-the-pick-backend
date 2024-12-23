const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    home_team: { type: String },
    home_team_logo: { type: String },
    away_team: { type: String },
    away_team_logo: { type: String },
    game_time: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Banner', bannerSchema);
