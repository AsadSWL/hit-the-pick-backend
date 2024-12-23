const mongoose = require('mongoose');

const marketSchema = new mongoose.Schema({
    key: { type: String },
    lastUpdate: { type: Date },
    outcomes: [
        {
            name: { type: String },
            price: { type: Number },
            point: { type: Number }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Market', marketSchema);
