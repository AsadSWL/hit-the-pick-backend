const axios = require('axios');
const League = require('../models/leagueModel');
const Match = require('../models/matchModel');
const Bookmaker = require('../models/bookmakerModel');
const Market = require('../models/marketModel');
const Pick = require('../models/pickModel');
const Package = require('../models/packageModel');
const Subscription = require('../models/subscriptionModel');
const Transaction = require('../models/transactionModel');
const Billing = require('../models/billingModel');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

exports.updateProfile = async (req, res) => {
    try {
        const { firstname, lastname, email } = req.body;
        const userId = req.user.id;

        const user = await User.findByIdAndUpdate(userId, { firstname, lastname, email }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const authPayload = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(authPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({ user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile.' });
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const { password, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);

        const isMatch = await user.isPasswordMatch(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password.' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password.' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const handicappers = await User.find({ role: 'handicapper' }).countDocuments();
        const users = await User.find({ role: 'user' }).countDocuments();
        const sales = await Transaction.aggregate([
            {
                $group: {
                    _id: null,
                    amount: { $sum: "$totalPrice" }
                }
            }
        ]);

        const stats = {
            "handicappers": handicappers,
            "users": users,
            "sales": sales.length > 0 ? sales[0].totalSum : 0,
        }

        res.status(201).json({ status: true, stats: stats });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Failed to get stats' });
    }
}

exports.syncSportsData = async (req, res) => {
    try {
        const apiKey = process.env.ODDS_API_KEY;

        const leaguesResponse = await axios.get(`https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`);
        const leagues = leaguesResponse.data;

        for (const league of leagues) {
            const existingLeague = await League.findOne({ key: league.key });

            if (!existingLeague) {
                await League.create({
                    key: league.key,
                    group: league.group,
                    title: league.title,
                    description: league.description,
                    active: league.active,
                    hasOutrights: league.has_outrights,
                });
            }
        }

        for (const league of leagues) {
            const oddsResponse = await axios.get(
                `https://api.the-odds-api.com/v4/sports/${league.key}/odds?regions=us&oddsFormat=american&apiKey=${apiKey}`
            );
            const matches = oddsResponse.data;

            for (const match of matches) {
                const existingMatch = await Match.findOne({ matchId: match.id });

                if (!existingMatch) {
                    const matchData = await Match.create({
                        matchId: match.id,
                        sportKey: match.sport_key,
                        sportTitle: match.sport_title,
                        commenceTime: match.commence_time,
                        homeTeam: match.home_team,
                        awayTeam: match.away_team,
                    });

                    for (const bookmaker of match.bookmakers) {
                        const bookmakerData = await Bookmaker.create({
                            key: bookmaker.key,
                            title: bookmaker.title,
                            lastUpdate: bookmaker.last_update,
                        });

                        for (const market of bookmaker.markets) {
                            const marketData = await Market.create({
                                key: market.key,
                                lastUpdate: market.last_update,
                                outcomes: market.outcomes,
                            });

                            bookmakerData.markets.push(marketData._id);
                        }

                        await bookmakerData.save();
                        matchData.bookmakers.push(bookmakerData._id);
                    }

                    await matchData.save();
                }
            }
        }

        res.status(200).json({ status: true, message: 'Leagues and matches synced successfully.' });
    } catch (error) {
        console.error('Error syncing sports data:', error.message);
        res.status(500).json({ status: false, message: 'Failed to sync sports data.' });
    }
};

exports.getAllHandicappers = async (req, res) => {
    try {
        const users = await User.find({ role: 'handicapper' }).select('-password');
        res.status(200).json({ status: true, users });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve users.' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        res.status(200).json({ status: true, users });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve users.' });
    }
};

exports.getAllPicks = async (req, res) => {
    try {
        const picks = await Pick.find().populate('handicapperId match');
        res.status(200).json({ status: true, picks });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve picks.' });
    }
};

exports.getAllPackages = async (req, res) => {
    try {
        const packages = await Package.find();
        res.status(200).json({ status: true, packages });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve packages.' });
    }
};

exports.getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.status(200).json({ status: true, subscriptions });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve subscriptions.' });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transaction = await Transaction.find();
        res.status(200).json({ status: true, transaction });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve transaction.' });
    }
};

exports.getWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Billing.find().populate('handicapper');
        res.status(200).json({ status: true, withdrawals });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to retrieve billings.' });
    }
};

exports.toggleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found.' });
        }

        user.status = user.status === 'Active' ? 'Inactive' : 'Active';
        await user.save();

        res.status(200).json({ status: true, message: `User ${user.status} successfully.` });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to update user status.' });
    }
};

exports.approveWithdrawals = async (req, res) => {
    try {
        const { id } = req.params;
        const billing = await Billing.findById(id);

        if (!billing) {
            return res.status(404).json({ status: false, message: 'Withdraw request not found.' });
        }

        billing.status = billing.status === 'pending' ? 'approved' : 'pending';
        await billing.save();

        res.status(200).json({ status: true, message: `Withdrawal request approved successfully.` });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: 'Failed to update withdrawal status.' });
    }
};