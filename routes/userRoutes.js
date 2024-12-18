const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.put('/update-profile', authMiddleware, roleMiddleware(['user']), userController.updateProfile);
router.put('/update-password', authMiddleware, roleMiddleware(['user']), userController.updatePassword);

router.get('/get-banner', userController.getBanner);
router.get('/recent-match', userController.getRecentMatchWithLogos);
router.get('/get-picks', userController.getAvailablePicks);
router.get('/free-picks', userController.getFreePicks);
router.get('/free-pick/:id', userController.getFreePick);
router.get('/pick/:id', authMiddleware, roleMiddleware(['user']), userController.getPick);
router.get('/package/:id', authMiddleware, roleMiddleware(['user']), userController.getPackage);
router.get('/subscription/:id', authMiddleware, roleMiddleware(['user']), userController.getSubscription);
router.get('/get-packages', userController.getAvailablePackages);
router.get('/get-subscriptions', userController.getAvailableSubscriptions);
router.get('/subscription/:id/league-picks', userController.getPicksForLeagues);


router.get('/picks', authMiddleware, roleMiddleware(['user']), userController.getAvailablePicks);
router.get('/packages', authMiddleware, roleMiddleware(['user']), userController.getAvailablePackages);
router.get('/subscriptions', authMiddleware, roleMiddleware(['user']), userController.getAvailableSubscriptions);

router.get('/purchased-picks', authMiddleware, roleMiddleware(['user']), userController.getPurchasedPicks);
router.get('/purchased-packages', authMiddleware, roleMiddleware(['user']), userController.getPurchasedPackages);
router.get('/purchased-subscriptions', authMiddleware, roleMiddleware(['user']), userController.getActiveSubscriptions);

router.post('/create-order', authMiddleware, paymentController.createOrder);
router.post('/capture-order', authMiddleware, paymentController.captureOrder);
router.post('/create-payment-intent', authMiddleware, paymentController.createPaymentIntent);
router.post('/pay-with-credits', authMiddleware, paymentController.purchaseWithCredits);
router.get('/credits', authMiddleware, paymentController.getUserCredits);

router.get('/get-handicappers', userController.handicappers);
router.get('/get-handicapper/:id', userController.getHandicapper);

module.exports = router;
