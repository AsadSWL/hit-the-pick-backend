const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    handicapper: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    name: { type: String },
    durationInDays: { type: String },
    leagues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'League' }],
    description: { type: String },
    price: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
