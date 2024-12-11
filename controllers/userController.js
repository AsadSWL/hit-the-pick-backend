const Transaction = require('../models/transactionModel');
const Pick = require('../models/pickModel');
const Package = require('../models/packageModel');
const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel');

exports.updateProfile = async (req, res) => {
    try {
        const { firstname, lastname, email } = req.body;
        const userId = req.user.id;

        const user = await User.findByIdAndUpdate(userId, { firstname, lastname, email }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { password, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        const isMatch = await user.isPasswordMatch(password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password' });
    }
};

exports.getAvailablePicks = async (req, res) => {
    try {
        const currentTime = new Date();

        const picks = await Pick.find({ playType: 'Premium' }).populate({
            path: 'handicapperId match',
            match: { commenceTime: { $gt: currentTime } },
        });

        const validPicks = picks.filter((pick) => pick.match);

        res.status(200).json(validPicks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getFreePicks = async (req, res) => {
    try {
        const currentTime = new Date();

        const picks = await Pick.find({ playType: 'Free' }).populate({
            path: 'handicapperId match',
            match: { commenceTime: { $gt: currentTime } },
        });

        const validPicks = picks.filter((pick) => pick.match);

        res.status(200).json(validPicks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getPick = async (req, res) => {
    try {
        const pickId = req.params.id;
        const picks = await Pick.find({ _id: pickId }).populate('handicapperId match');
        res.status(200).json(picks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPackage = async (req, res) => {
    try {
        const packageId = req.params.id;
        const package = await Package.find({ _id: packageId }).populate('handicapper picks');
        res.status(200).json(package);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSubscription = async (req, res) => {
    try {
        const id = req.params.id;
        const subscription = await Subscription.find({ _id: id }).populate('handicapper leagues');
        res.status(200).json(subscription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPicksForLeagues = async (req, res) => {
    try {
        const { id } = req.params;

        const subscription = await Subscription.findById(id).populate('leagues');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const leagueIds = subscription.leagues.map((league) => league._id);

        const currentTime = new Date();

        const picks = await Pick.find({ league: { $in: leagueIds } })
            .populate({
                path: 'match',
                match: { commenceTime: { $gt: currentTime } }
            });

        const validPicks = picks.filter((pick) => pick.match);

        return res.status(200).json({ subscription, picks: validPicks });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to fetch picks for leagues' });
    }
};

exports.getAvailablePackages = async (req, res) => {
    try {
        const currentTime = new Date();

        const packages = await Package.find().populate([
            { path: 'handicapper' },
            {
                path: 'picks',
                populate: {
                    path: 'match',
                    match: { commenceTime: { $gt: currentTime } },
                },
            },
        ]);

        const filteredPackages = packages.map((pkg) => ({
            ...pkg._doc,
            picks: pkg.picks.filter((pick) => pick.match),
        }));

        res.status(200).json(filteredPackages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAvailableSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.status(200).json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getPurchasedPicks = async (req, res) => {
    try {
        const picks = await Transaction.find({ userId: req.user.id, pickId: { $ne: null } })
            .populate('pickId');
        res.status(200).json({ picks });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching purchased picks' });
    }
};

exports.getPurchasedPackages = async (req, res) => {
    try {
        const packages = await Transaction.find({ userId: req.user.id, packageId: { $ne: null } })
            .populate('packageId');
        res.status(200).json({ packages });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching purchased packages' });
    }
};

exports.getActiveSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Transaction.find({ userId: req.user.id, subscriptionId: { $ne: null } })
            .populate('subscriptionId');
        res.status(200).json({ subscriptions });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscriptions' });
    }
};

exports.handicappers = async (req, res) => {
    try {
        const handicappers = await User.find({ role: 'handicapper' });
        console.log(handicappers)
        res.status(200).json(handicappers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHandicapper = async (req, res) => {
    try {
        const userId = req.params.id;
        const handicapper = await User.findOne({ _id: userId });
        res.status(200).json(handicapper);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};