const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    matchId: { type: String },
    sportKey: { type: String },
    sportTitle: { type: String },
    commenceTime: { type: Date },
    homeTeam: { type: String },
    awayTeam: { type: String },
    bookmakers: [
        {
            bookmaker: { type: mongoose.Schema.Types.ObjectId, ref: 'Bookmaker' },
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
