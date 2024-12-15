const mongoose = require('mongoose');

const pickSchema = new mongoose.Schema({
    handicapperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String },
    league: { type: String },
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
    bookmaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Bookmaker', required: true },
    market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market', required: true },
    outcome: { type: String },
    playType: { type: String },
    analysis: { type: String },
    status: { type: String, default: 'Live', },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pick', pickSchema);
