const Transaction = require('../models/transactionModel');
const Pick = require('../models/pickModel');
const Package = require('../models/packageModel');
const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel');
const axios = require('axios');
const Banner = require('../models/bannerModel');

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

        const picks = await Pick.find({ playType: 'Premium' })
            .populate({
                path: 'handicapperId',
                select: 'profileImage firstname'
            })
            .populate({
                path: 'match',
                select: 'commenceTime',
                match: { commenceTime: { $gt: currentTime } },
            }).select('-league -outcome -market -bookmaker -analysis -status');

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

exports.getFreePick = async (req, res) => {
    try {
        const pickId = req.params.id;

        // Fetch the pick details and ensure it is a free pick
        const pick = await Pick.findOne({ _id: pickId, playType: 'Free' })
            .populate({
                path: 'handicapperId',
                select: 'firstname lastname',
            })
            .populate({
                path: 'match',
                select: 'sportTitle commenceTime homeTeam awayTeam',
            })
            .populate({
                path: 'market',
                select: 'outcomes',
            });

        if (!pick) {
            return res.status(404).json({ message: 'Pick not found or not free.' });
        }

        // Extract the selected outcome
        const selectedOutcome = pick.market?.outcomes?.find(
            (outcome) => outcome._id.toString() === pick.outcome
        );

        // Format the response with required fields
        const response = {
            sportTitle: pick.match?.sportTitle || null,
            matchTime: pick.match?.commenceTime || null,
            homeTeam: pick.match?.homeTeam || null,
            awayTeam: pick.match?.awayTeam || null,
            handicapper: {
                firstname: pick.handicapperId?.firstname || null,
                lastname: pick.handicapperId?.lastname || null,
            },
            analysis: pick.analysis || null,
            createdAt: pick.createdAt || null,
            selectedOutcome: selectedOutcome || null,
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getPick = async (req, res) => {
    try {
        const userId = req.user.id;
        const pickId = req.params.id;

        // Check if the pick is directly purchased
        const hasDirectTransaction = await Transaction.findOne({ userId, pickId });

        // Check if the pick is part of a purchased package
        const hasPackageAccess = await Transaction.findOne({
            userId,
            packageId: { $ne: null }, // Ensure package transactions are considered
        }).populate({
            path: 'packageId',
            match: { picks: pickId }, // Check if the package includes the pick
        });

        // Check if the pick is part of a purchased subscription
        const hasSubscriptionAccess = await Transaction.findOne({
            userId,
            subscriptionId: { $ne: null }, // Ensure subscription transactions are considered
        }).populate({
            path: 'subscriptionId',
            match: { 'leagues': pickId }, // Match subscription-related league or picks
        });

        // If none of the above access methods are valid, deny access
        if (!hasDirectTransaction && !hasPackageAccess?.packageId && !hasSubscriptionAccess?.subscriptionId) {
            return res.status(403).json({ message: 'Access denied. You have not purchased this pick or its associated package/subscription.' });
        }

        // Fetch the pick details
        const pick = await Pick.findById(pickId)
            .populate({
                path: 'handicapperId',
                select: 'firstname lastname',
            })
            .populate({
                path: 'match',
                select: 'sportTitle commenceTime homeTeam awayTeam',
            })
            .populate({
                path: 'market',
                select: 'outcomes',
            });

        if (!pick) {
            return res.status(404).json({ message: 'Pick not found.' });
        }

        // Extract the selected outcome
        const selectedOutcome = pick.market?.outcomes?.find(
            (outcome) => outcome._id.toString() === pick.outcome
        );

        // Format the response with required fields
        const response = {
            sportTitle: pick.match?.sportTitle || null,
            matchTime: pick.match?.commenceTime || null,
            homeTeam: pick.match?.homeTeam || null,
            awayTeam: pick.match?.awayTeam || null,
            handicapper: {
                firstname: pick.handicapperId?.firstname || null,
                lastname: pick.handicapperId?.lastname || null,
            },
            analysis: pick.analysis || null,
            createdAt: pick.createdAt || null,
            selectedOutcome: selectedOutcome || null,
        };

        res.status(200).json(response);
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
        const subscriptions = await Subscription.find().populate(['handicapper']);
        res.status(200).json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getPurchasedPicks = async (req, res) => {
    try {
        const currentTime = new Date();

        const transactions = await Transaction.find({ userId: req.user.id, pickId: { $ne: null } })
            .populate({
                path: 'pickId',
                populate: [
                    { path: 'handicapperId' },
                    { 
                        path: 'match',
                        match: { commenceTime: { $gt: currentTime } } 
                    },
                    { 
                        path: 'market',
                        select: 'outcomes' 
                    }
                ]
            });

        const validPicks = transactions
            .map(transaction => transaction.pickId)
            .filter(pick => pick && pick.match);

        const picks = validPicks.map((pick) => {
            const selectedOutcome = pick.market?.outcomes?.find(
                (outcome) => outcome._id.toString() === pick.outcome
            );

            return {
                ...pick._doc,
                selectedOutcome: selectedOutcome || null, 
            };
        });

        res.status(200).json({ picks });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

exports.getRecentMatchWithLogos = async (req, res) => {
    try {
        const currentTime = new Date();

        // Find the nearest upcoming match
        const recentMatch = await Match.findOne({ commenceTime: { $gte: currentTime } })
            .sort({ commenceTime: 1 });

        if (!recentMatch) {
            return res.status(404).json({ message: 'No upcoming matches found.' });
        }


        // Fetch team logos
        const [homeTeamResponse, awayTeamResponse] = await Promise.all([
            axios.get(`https://www.thesportsdb.com/api/v1/json/searchteams.php?t=${recentMatch.homeTeam}`),
            axios.get(`https://www.thesportsdb.com/api/v1/json/searchteams.php?t=${recentMatch.awayTeam}`),
        ]);

        const homeTeamLogo = homeTeamResponse.data.teams?.[0]?.strTeamBadge || null;
        const awayTeamLogo = awayTeamResponse.data.teams?.[0]?.strTeamBadge || null;

        res.status(200).json({
            match: {
                homeTeam: recentMatch.homeTeam,
                awayTeam: recentMatch.awayTeam,
                commenceTime: recentMatch.commenceTime,
            },
            logos: {
                homeTeam: homeTeamLogo,
                awayTeam: awayTeamLogo,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent match or team logos.' });
    }
};

exports.getBanner = async (req, res) => {
    try {
        const banner = await Banner.findOne();

        if (!banner) {
            return res.status(404).json({ message: 'No match data found' });
        }

        res.status(200).json({
            home_team: banner.home_team,
            away_team: banner.away_team,
            game_time: banner.game_time,
            home_team_logo: banner.home_team_logo,
            away_team_logo: banner.away_team_logo
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving match data', error: error.message });
    }
}