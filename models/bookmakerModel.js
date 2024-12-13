const mongoose = require('mongoose');

const bookmakerSchema = new mongoose.Schema({
    key: { type: String },
    title: { type: String },
    lastUpdate: { type: Date },
    markets: [
        {
            market: { type: mongoose.Schema.Types.ObjectId, ref: 'Market' },
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bookmaker', bookmakerSchema);
