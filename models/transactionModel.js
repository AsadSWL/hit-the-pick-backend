const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    pickId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pick' },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tnxID: { type: String },
    amount: { type: String },
    method: { type: String },
    status: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
