const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard-stats', authMiddleware, roleMiddleware(['admin']), adminController.getDashboardStats);
router.put('/update-profile', authMiddleware, roleMiddleware(['admin']), adminController.updateProfile);
router.put('/update-password', authMiddleware, roleMiddleware(['admin']), adminController.updatePassword);

// router.get('/sync-sports-data', adminController.syncSportsData);

router.put('/toggle-user/:id', authMiddleware, roleMiddleware(['admin']), adminController.toggleUser);

router.get('/handicappers', authMiddleware, roleMiddleware(['admin']), adminController.getAllHandicappers);
router.get('/users', authMiddleware, roleMiddleware(['admin']), adminController.getAllUsers);
router.post('/add-banner', authMiddleware, roleMiddleware(['admin']), adminController.addBanner);
router.get('/get-banner', authMiddleware, roleMiddleware(['admin']), adminController.getBanner);

router.get('/picks', authMiddleware, roleMiddleware(['admin']), adminController.getAllPicks);
router.get('/packages', authMiddleware, roleMiddleware(['admin']), adminController.getAllPackages);
router.get('/subscriptions', authMiddleware, roleMiddleware(['admin']), adminController.getAllSubscriptions);
router.get('/transactions', authMiddleware, roleMiddleware(['admin', 'handicapper']), adminController.getAllTransactions);
router.get('/get-withdrawals', authMiddleware, roleMiddleware(['admin']), adminController.getWithdrawals);
router.put('/approve-withdrawal/:id', authMiddleware, roleMiddleware(['admin']), adminController.approveWithdrawals);

router.delete('/delete-pick/:pickId', authMiddleware, roleMiddleware(['admin']), adminController.deletePick);
router.delete('/delete-package/:packageId', authMiddleware, roleMiddleware(['admin']), adminController.deletePackage);
router.delete('/delete-subscription/:subscriptionId', authMiddleware, roleMiddleware(['admin']), adminController.deleteSubscription);

module.exports = router;
