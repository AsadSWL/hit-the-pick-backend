const Pick = require('../models/pickModel');
const Subscription = require('../models/subscriptionModel');
const Transaction = require('../models/transactionModel');
const Package = require('../models/packageModel');
const Match = require('../models/matchModel');
const User = require('../models/userModel');
const League = require('../models/leagueModel');
const Bookmaker = require('../models/bookmakerModel');
const Market = require('../models/marketModel');
const Billing = require('../models/billingModel');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/handicappers/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const uploadHandicapperProfile = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
}).single('image');

exports.updateProfile = async (req, res) => {
    uploadHandicapperProfile(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ status: false, error: err.message });
        }
        console.log(req.body);
        const { firstname, lastname, email, bio } = req.body;
        const userId = req.user.id;
        const imageUrl = req.file ? `/uploads/handicappers/${req.file.filename}` : null;

        try {
            const user = await User.findByIdAndUpdate(userId, { firstname, lastname, email, profileImage: imageUrl, bio }, { new: true });
        
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            res.status(200).json({ message: 'Profile updated successfully', user });
        } catch (error) {
            res.status(500).json({ message: 'Error updating profile' });
        }
    });
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

exports.getDashboardStats = async (req, res) => {
    try {
        const handicapperId = req.user.id;
        const picks = await Pick.find({ handicapperId: handicapperId }).countDocuments();
        const packages = await Package.find({ handicapper: handicapperId }).countDocuments();
        const subscriptions = await Subscription.find({ handicapper: handicapperId }).countDocuments();
        const user = await User.find({ _id: handicapperId });

        const stats = {
            "picks": picks,
            "packages": packages,
            "subscriptions": subscriptions,
            "balance": user?.balance || 0,
        }

        res.status(201).json({ status: true, stats: stats });
    } catch (error) {
        res.status(500).json({ status: false, error: 'Failed to get stats' });
    }
}

exports.createPick = async (req, res) => {
    try {
        const { title, outcome, league, bookmaker, market, match, playType, analysis } = req.body;
        const handicapperId = req.user.id;

        const pick = new Pick({
            handicapperId,
            title,
            league,
            match,
            outcome,
            bookmaker,
            market,
            playType,
            analysis,
        });

        await pick.save();
        res.status(201).json({ message: 'Pick created successfully', pick });
    } catch (error) {
        res.status(500).json({ message: 'Error creating pick' });
    }
};

exports.getPicks = async (req, res) => {
    try {
        const picks = await Pick.find({ handicapperId: req.user.id }).populate('handicapperId match bookmaker market');
        res.status(200).json({ picks });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching picks' });
    }
};

exports.getLeagues = async (req, res) => {
    try {
        const leagues = await League.find();
        res.status(200).json({ leagues });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leagues' });
    }
};

exports.getGames = async (req, res) => {
    try {
        const currentTime = new Date();
        const games = await Match.find({ sportKey: req.params.leagueKey, commenceTime: { $gt: currentTime } });
        res.status(200).json({ games });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leagues' });
    }
};

exports.getBookmakers = async (req, res) => {
    try {
        const game = await Match.findOne({ _id: req.params.gameId }).lean();

        if (!game) {
            console.log(`No game found with ID: ${gameId}`);
            return null;
        }

        // Fetch bookmakers
        const bookmakerIds = game.bookmakers;
        const bookmakers = await Bookmaker.find({ _id: { $in: bookmakerIds } }).lean();

        // Fetch markets for each bookmaker
        for (const bookmaker of bookmakers) {
            const marketIds = bookmaker.markets || [];
            const markets = await Market.find({ _id: { $in: marketIds } }).lean();
            bookmaker.markets = markets; // Replace market IDs with actual market documents
        }

        // Attach populated bookmakers back to the game
        game.bookmakers = bookmakers;

        res.status(200).json({ game });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leagues' });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        const { name, durationInDays, leagues, description, price } = req.body;
        const handicapper = req.user.id;

        const subscription = new Subscription({
            handicapper,
            name,
            durationInDays,
            leagues,
            description,
            price,
        });

        await subscription.save();
        res.status(201).json({ message: 'Subscription created successfully', subscription });
    } catch (error) {
        res.status(500).json({ message: 'Error creating subscription' });
    }
};

exports.getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.status(200).json({ subscriptions });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subscriptions' });
    }
};

exports.createPackage = async (req, res) => {
    try {
        const { name, description, picks, price } = req.body;
        const handicapper = req.user.id;

        const package = new Package({
            handicapper,
            name,
            description,
            picks,
            price,
        });

        await package.save();
        res.status(201).json({ message: 'Package created successfully', package });
    } catch (error) {
        res.status(500).json({ message: 'Error creating package' });
    }
};

exports.getPackages = async (req, res) => {
    try {
        const handicapper = req.user.id;
        const packages = await Package.find({handicapper: handicapper}).populate('picks handicapper');
        res.status(200).json({ packages });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching packages' });
    }
};

exports.createWithdrawal = async (req, res) => {
    try {
        const { amount, method, account } = req.body;
        const status = "pending";
        const userId = req.user.id;
        const lastEntry = await Billing.findOne().sort({ billingID: -1 });

        const nextNumber = lastEntry ? lastEntry.number + 1 : 10000;

        const bill = new Billing({
            handicapper: userId,
            billingID: nextNumber,
            amount,
            method,
            account,
            status,
        });

        await bill.save();
        res.status(201).json({ message: 'Bill created successfully', bill });
    } catch (error) {
        res.status(500).json({ message: 'Error creating bill' });
    }
};

exports.getWithdrawals = async (req, res) => {
    try {
        const handicapper = req.user.id;
        const withdrawals = await Billing.find({ handicapper: handicapper });

        res.status(201).json({ message: 'Withdraw requested successfully', withdrawals });
    } catch (error) {
        res.status(500).json({ message: 'Error requesting withdraw' });
    }
};

exports.deletePick = async (req, res) => {
    try {
        const { pickId } = req.params;

        const transaction = await Transaction.findOne({ pickId });
        if (transaction) {
            return res.status(400).json({ message: 'Cannot delete pick. Purchases have been made.' });
        }

        // Delete the pick
        const deletedPick = await Pick.findByIdAndDelete(pickId);
        if (!deletedPick) {
            return res.status(404).json({ message: 'Pick not found.' });
        }

        res.status(200).json({ message: 'Pick deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting pick.' });
    }
};

exports.deletePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const transaction = await Transaction.findOne({ packageId });
        if (transaction) {
            return res.status(400).json({ message: 'Cannot delete package. Purchases have been made.' });
        }

        // Delete the pick
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

        const transaction = await Transaction.findOne({ subscriptionId });
        if (transaction) {
            return res.status(400).json({ message: 'Cannot delete subscription. Purchases have been made.' });
        }

        // Delete the pick
        const deletedSubscription = await Subscription.findByIdAndDelete(subscriptionId);
        if (!deletedSubscription) {
            return res.status(404).json({ message: 'Subscription not found.' });
        }

        res.status(200).json({ message: 'Subdcription deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting subscription.' });
    }
};