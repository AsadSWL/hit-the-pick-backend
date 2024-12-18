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
const Banner = require('../models/bannerModel');
const OddsAPI = require('../models/OddsAPIModel');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/banner/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadBanner = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
}).fields([
    { name: 'home_team_logo', maxCount: 1 },
    { name: 'away_team_logo', maxCount: 1 }
]);

exports.addBanner = async (req, res) => {
    uploadBanner(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: false, error: err.message });
        }

        const { home_team, away_team, game_time } = req.body;
        
        const homeTeamLogoUrl = req.files['home_team_logo'] ? `/uploads/banner/${req.files['home_team_logo'][0].filename}` : null;
        const awayTeamLogoUrl = req.files['away_team_logo'] ? `/uploads/banner/${req.files['away_team_logo'][0].filename}` : null;

        try {
            await Banner.deleteMany({});

            const banner = new Banner({
                home_team,
                away_team,
                game_time,
                home_team_logo: homeTeamLogoUrl,
                away_team_logo: awayTeamLogoUrl
            });

            await banner.save();

            res.status(200).json({ message: 'Banner added successfully', banner });
        } catch (error) {
            res.status(500).json({ message: 'Error adding banner', error: error.message });
        }
    });
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

exports.syncSportsData = async () => {
    try {
        const apiKey = process.env.ODDS_API_KEY;

        // Fetch all leagues
        const leaguesResponse = await axios.get(`https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`);
        const leagues = leaguesResponse.data;

        // Update leagues in database
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

        const activeLeagues = await League.find({ active: true });

        for (const league of activeLeagues) {
            let oddsResponse = [];
            console.log(league.key);
            try {
                oddsResponse = await axios.get(
                    `https://api.the-odds-api.com/v4/sports/${league.key}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
                );
            } catch {
                oddsResponse = await axios.get(
                    `https://api.the-odds-api.com/v4/sports/${league.key}/odds/?apiKey=${apiKey}&regions=us&oddsFormat=american`
                );
            }
            const matches = oddsResponse.data;

            for (const match of matches) {
                const existingMatch = await Match.findOne({ matchId: match.id });
                console.log(match.sport_key);
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

        console.log('Active leagues and matches synced successfully.');
    } catch (error) {
        console.error('Error syncing sports data:', error.message);
    }
};

exports.checkPickStatus = async () => {
    try {
        const livePicks = await Pick.find({ status: 'Live' }).populate('match market bookmaker');
        for (const pick of livePicks) {
            try {
                // Fetch the latest odds and match result
                const oddsResponse = await axios.get(
                    `https://api.the-odds-api.com/v4/sports/${pick.match.sportKey}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
                );
                const matchDetails = oddsResponse.data.find(
                    (match) => match.id === pick.match.matchId
                );
                if (!matchDetails) continue;
                const result = determineResult(matchDetails, pick.market, pick.outcome);
                if (result.status === 'Won') {
                    // Update pick status
                    pick.status = 'Won';
                    await pick.save();
                    // Handle winnings
                    const transaction = await Transaction.findOne({ pickId: pick._id });
                    if (transaction) {
                        const { amount } = transaction;
                        const user = await User.findById(transaction.userId);
                        const handicapper = await User.findById(pick.handicapperId);
                        const winnings = calculateWinnings(amount, result.odds);

                        user.balance = (user.balance || 0) + winnings.userBonus;
                        handicapper.balance = (handicapper.balance || 0) + winnings.handicapperShare + 25;
                        await user.save();
                        await handicapper.save();
                    }
                } else if (result.status === 'Lost') {
                    pick.status = 'Lost';
                    await pick.save();
                    const transaction = await Transaction.findOne({ pickId: pick._id });
                    if (transaction) {
                        const user = await User.findById(transaction.userId);
                        user.balance = (user.balance || 0) + 25;
                        await user.save();
                    }
                }
            } catch (error) {
                console.error(`Error processing pick ${pick._id}:`, error.message);
                continue;
            }
        }
    } catch (error) {
        console.error('Error checking pick statuses:', error.message);
    }
};

function determineResult(matchDetails, market, outcome) {
    const marketData = matchDetails.bookmakers.flatMap((b) => b.markets).find((m) => m.key === market.key);
    if (!marketData || !marketData.outcomes) {
        return { status: 'Pending', odds: null };
    }
    let selectedOutcomeName = '';
    if(market?.outcomes[0]._id.toString() === outcome) {
        selectedOutcomeName = market?.outcomes[0].name;
    }
    if(market?.outcomes[1]._id.toString() === outcome) {
        selectedOutcomeName = market?.outcomes[1].name;
    }
    const selectedOutcome = marketData.outcomes.find((o) => o.name === selectedOutcomeName);
    if (!selectedOutcome) {
        return { status: 'Pending', odds: null };
    }

    const isWon = checkMarketWinCondition(marketData, selectedOutcome);
    return isWon ? { status: 'Won', odds: selectedOutcome.price } : { status: 'Lost', odds: null };
}

function calculateWinnings(amount, odds) {
    const userBonus = 25 * Math.abs(odds);
    const handicapperShare = amount + userBonus;
    return { userBonus, handicapperShare };
}

function checkMarketWinCondition(marketData, selectedOutcome) {
    if (!marketData || !marketData.outcomes || !selectedOutcome) {
        throw new Error('Invalid input: marketData or selectedOutcome is missing.');
    }
    switch (marketData.key) {
        case 'h2h':
            return checkH2HWinCondition(marketData, selectedOutcome);
        case 'spreads':
            return checkSpreadsWinCondition(marketData, selectedOutcome);
        case 'totals':
            return checkTotalsWinCondition(marketData, selectedOutcome);
        default:
            console.warn(`Unsupported market type: ${marketData.key}`);
            return false;
    }
}

function checkH2HWinCondition(marketData, selectedOutcome) {
    return marketData.outcomes.some(
        (outcome) => outcome.name === selectedOutcome.name && outcome.price > 0
    );
}

function checkSpreadsWinCondition(marketData, selectedOutcome) {
    return marketData.outcomes.some((outcome) => {
        if (outcome.name !== selectedOutcome.name) {
            return false;
        }
        const isSpreadCovered =
            outcome.point > 0 ? outcome.price > 0 : outcome.price < 0;
        return isSpreadCovered;
    });
}

function checkTotalsWinCondition(marketData, selectedOutcome) {
    return marketData.outcomes.some((outcome) => {
        if (outcome.name !== selectedOutcome.name) {
            return false;
        }
        return outcome.price > 0;
    });
}

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

exports.deletePick = async (req, res) => {
    try {
        const { pickId } = req.params;

        // Delete the pick directly
        const deletedPick = await Pick.findByIdAndDelete(pickId);
        if (!deletedPick) {
            return res.status(404).json({ message: 'Pick not found.' });
        }

        res.status(200).json({ message: 'Pick deleted successfully, regardless of purchases.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pick.' });
    }
};


exports.deletePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const deletedPackage = await Package.findByIdAndDelete(packageId);
        if (!deletedPackage) {
            return res.status(404).json({ message: 'Package not found.' });
        }

        res.status(200).json({ message: 'Package deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting package.' });
    }
};

exports.deleteSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        const deletedSubscription = await Subscription.findByIdAndDelete(subscriptionId);
        if (!deletedSubscription) {
            return res.status(404).json({ message: 'Subscription not found.' });
        }

        res.status(200).json({ message: 'Subdcription deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting subscription.' });
    }
};
