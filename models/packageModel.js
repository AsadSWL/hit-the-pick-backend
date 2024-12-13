const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: { type: String },
    handicapper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String },
    picks: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Pick' } ],
    price: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Package', packageSchema);
