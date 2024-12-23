const mongoose = require('mongoose');

const leagueSchema = new mongoose.Schema({
    key: { type: String },
    group: { type: String },
    title: { type: String },
    desctiption: { type: String },
    active: { type: Boolean },
    hasOutrights: { type: Boolean },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('League', leagueSchema);
