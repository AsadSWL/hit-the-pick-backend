const mongoose = require('mongoose');
const cron = require('node-cron');

const packageSchema = new mongoose.Schema({
    name: { type: String },
    handicapper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String },
    picks: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Pick' } ],
    price: { type: Number },
    guaranteed: { type: Boolean },
    status: { type: String, enum: ['Live', 'Completed'], default: 'Live' },
    createdAt: { type: Date, default: Date.now }
});

packageSchema.statics.evaluatePackage = async function (packageId) {
    const Package = this;
    const packageData = await Package.findById(packageId).populate('picks handicapper');

    if (!packageData) {
        throw new Error('Package not found');
    }

    if (!packageData.guaranteed) {
        console.log(`Package ${packageData.name} is not guaranteed.`);
        return;
    }

    const picks = packageData.picks;
    const user = await mongoose.model('User').findById(packageData.handicapper._id);

    if (!picks || picks.length === 0) {
        console.log(`Package ${packageData.name} has no picks.`);
        return;
    }

    const livePicks = picks.filter((pick) => pick.status === 'Live');

    if (livePicks.length > 0) {
        console.log(`Package ${packageData.name} has live picks. Evaluation postponed.`);
        return;
    }

    const wonPicks = picks.filter((pick) => pick.status === 'Won');
    const lostPicks = picks.filter((pick) => pick.status === 'Lost');

    if (lostPicks.length > wonPicks.length) {
        user.balance = (user.balance || 0) + packageData.price;
        console.log(`Package ${packageData.name}: Amount added to user balance.`);
    } else {
        packageData.handicapper.balance = (packageData.handicapper.balance || 0) + packageData.price;
        console.log(`Package ${packageData.name}: Amount added to handicapper balance.`);
    }

    packageData.status = 'Completed';
    await packageData.save();
    await user.save();
    await packageData.handicapper.save();
};

cron.schedule('0 * * * *', async () => {
    try {
        console.log('Running cron job to evaluate live packages...');
        const Package = mongoose.model('Package');
        const livePackages = await Package.find({ status: 'Live' });

        for (const livePackage of livePackages) {
            await Package.evaluatePackage(livePackage._id);
        }

        console.log('Cron job completed successfully.');
    } catch (error) {
        console.error('Error running cron job:', error.message);
    }
});

module.exports = mongoose.model('Package', packageSchema);