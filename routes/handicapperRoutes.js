const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const handicapperController = require('../controllers/handicapperController');

const router = express.Router();

// Profile Management
router.put('/update-profile', authMiddleware, roleMiddleware(['handicapper']), handicapperController.updateProfile);
router.put('/update-password', authMiddleware, roleMiddleware(['handicapper']), handicapperController.updatePassword);

router.get('/dashboard-stats', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getDashboardStats);
router.get('/get-leagues', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getLeagues);
router.get('/get-games/:leagueKey', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getGames);
router.get('/get-bookmakers/:gameId', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getBookmakers);

// Picks Management
router.post('/create-pick', authMiddleware, roleMiddleware(['handicapper']), handicapperController.createPick);
router.get('/picks', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getPicks);
router.delete('/delete-pick/:pickId', authMiddleware, roleMiddleware(['handicapper']), handicapperController.deletePick);

// Subscription Management
router.post('/create-subscription', authMiddleware, roleMiddleware(['handicapper']), handicapperController.createSubscription);
router.get('/subscriptions', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getSubscriptions);
router.delete('/delete-subscription/:subscriptionId', authMiddleware, roleMiddleware(['handicapper']), handicapperController.deleteSubscription);

// Package Management
router.post('/create-package', authMiddleware, roleMiddleware(['handicapper']), handicapperController.createPackage);
router.get('/packages', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getPackages);
router.delete('/delete-package/:packageId', authMiddleware, roleMiddleware(['handicapper']), handicapperController.deletePackage);

router.post('/create-withdrawal', authMiddleware, roleMiddleware(['handicapper']), handicapperController.createWithdrawal);
router.get('/get-withdrawals', authMiddleware, roleMiddleware(['handicapper']), handicapperController.getWithdrawals);

module.exports = router;
