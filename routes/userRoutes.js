const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.put('/update-profile', authMiddleware, roleMiddleware(['user']), userController.updateProfile);
router.put('/update-password', authMiddleware, roleMiddleware(['user']), userController.updatePassword);

router.get('/get-picks', userController.getAvailablePicks);
router.get('/pick/:id', userController.getPick);
router.get('/get-packages', userController.getAvailablePackages);
router.get('/get-subscriptions', userController.getAvailableSubscriptions);

router.get('/picks', authMiddleware, roleMiddleware(['user']), userController.getAvailablePicks);
router.get('/packages', authMiddleware, roleMiddleware(['user']), userController.getAvailablePackages);
router.get('/subscriptions', authMiddleware, roleMiddleware(['user']), userController.getAvailableSubscriptions);

router.get('/purchased-picks', authMiddleware, roleMiddleware(['user']), userController.getPurchasedPicks);
router.get('/purchased-packages', authMiddleware, roleMiddleware(['user']), userController.getPurchasedPackages);
router.get('/purchased-subscriptions', authMiddleware, roleMiddleware(['user']), userController.getActiveSubscriptions);

router.post('/create-order', authMiddleware, paymentController.createOrder);
router.post('/capture-order', authMiddleware, paymentController.captureOrder);

module.exports = router;
