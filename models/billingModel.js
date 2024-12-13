const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    handicapper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    billingID: { type: Number },
    amount: { type: Number },
    status: { type: String },
    method: { type: String },
    account: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Billing', billingSchema);
