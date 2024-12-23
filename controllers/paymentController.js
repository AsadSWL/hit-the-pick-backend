const paypal = require('@paypal/checkout-server-sdk');
const Transaction = require('../models/transactionModel');
const Package = require('../models/packageModel');
const Subscription = require('../models/subscriptionModel');
const Pick = require('../models/pickModel');
const User = require('../models/userModel');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const nodemailer = require('nodemailer');

const paypalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET)
);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper function to send email
const sendPurchaseEmail = async (user, transactionDetails) => {
    const emailBody = `
        <h3>Purchase Confirmation</h3>
        <p>Dear ${user.firstname} ${user.lastname},</p>
        <p>Thank you for your purchase!</p>
        <p><strong>Transaction Details:</strong></p>
        <ul>
            <li><strong>Type:</strong> ${transactionDetails.type}</li>
            <li><strong>Item ID:</strong> ${transactionDetails.itemId}</li>
            <li><strong>Transaction ID:</strong> ${transactionDetails.tnxID}</li>
            <li><strong>Amount:</strong> $${transactionDetails.amount.toFixed(2)}</li>
            <li><strong>Payment Method:</strong> ${transactionDetails.method}</li>
        </ul>
        <p>We appreciate your business and hope you enjoy your purchase.</p>
        <p>Best Regards,</p>
        <p>Your Company Team</p>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Purchase Confirmation',
        html: emailBody,
    });
};

exports.getUserCredits = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ credits: user.balance });
    } catch (error) {
        console.error('Error fetching user credits:', error.message);
        res.status(500).json({ message: 'Failed to fetch user credits.' });
    }
};

exports.createOrder = async (req, res) => {
    const { type, itemId } = req.body;

    try {
        let item, amount;

        if (type === 'pick') {
            item = await Pick.findById(itemId);
            amount = 25;
        } else if (type === 'package') {
            item = await Package.findById(itemId);
            amount = item.price;
        } else if (type === 'subscription') {
            item = await Subscription.findById(itemId);
            amount = item.price;
        } else {
            return res.status(400).json({ message: 'Invalid purchase type.' });
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: 'USD',
                        value: amount,
                    },
                },
            ],
        });

        const order = await paypalClient.execute(request);
        res.status(201).json({ orderID: order.result.id });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Failed to create PayPal order.' });
    }
};

exports.captureOrder = async (req, res) => {
    const { orderID, type, itemId } = req.body;

    try {
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});
        const capture = await paypalClient.execute(request);

        console.log('Capture Response:', capture.result);

        if (capture.result.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'PayPal payment failed. Purchase not completed.' });
        }

        const purchaseUnits = capture?.result?.purchase_units || [];
        const amountValue = purchaseUnits[0]?.payments?.captures[0]?.amount?.value || '0.00';

        const transaction = await Transaction.create({
            pickId: type === 'pick' ? itemId : null,
            packageId: type === 'package' ? itemId : null,
            subscriptionId: type === 'subscription' ? itemId : null,
            userId: req.user.id,
            tnxID: capture.result.id,
            amount: amountValue,
            method: 'paypal',
            status: 'completed',
        });

        const user = await User.findById(req.user.id);
        await sendPurchaseEmail(user, {
            type,
            itemId,
            tnxID: capture.result.id,
            amount: amountValue,
            method: 'paypal',
        });

        res.status(200).json({ message: 'Payment successful.', capture });
    } catch (error) {
        console.error('Error during capture:', error.message);
        res.status(500).json({ message: 'Failed to capture PayPal order.' });
    }
};

exports.createPaymentIntent = async (req, res) => {
    const { type, itemId } = req.body;
    try {
        let item, amount;

        if (type === 'pick') {
            item = await Pick.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Pick not found.' });
            amount = 2500;
        } else if (type === 'package') {
            item = await Package.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Package not found.' });
            amount = item.price * 100;
        } else if (type === 'subscription') {
            item = await Subscription.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Subscription not found.' });
            amount = item.price * 100;
        } else {
            return res.status(400).json({ message: 'Invalid purchase type.' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card'],
            metadata: {
                type,
                itemId,
            },
        });

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: 'Stripe payment failed. Purchase not completed.' });
        }

        const transaction = await Transaction.create({
            pickId: type === 'pick' ? itemId : null,
            packageId: type === 'package' ? itemId : null,
            subscriptionId: type === 'subscription' ? itemId : null,
            userId: req.user.id,
            tnxID: paymentIntent.id,
            amount: amount,
            method: 'stripe',
            status: 'completed',
        });

        const user = await User.findById(req.user.id);
        await sendPurchaseEmail(user, {
            type,
            itemId,
            tnxID: paymentIntent.id,
            amount: amount / 100,
            method: 'stripe',
        });

        res.status(201).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating Stripe Payment Intent:', error.message);
        res.status(500).json({ message: 'Failed to create payment intent.' });
    }
};

exports.purchaseWithCredits = async (req, res) => {
    const { type, itemId } = req.body;

    try {
        let item, amount;

        if (type === 'pick') {
            item = await Pick.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Pick not found.' });
            amount = 25;
        } else if (type === 'package') {
            item = await Package.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Package not found.' });
            amount = item.price;
        } else if (type === 'subscription') {
            item = await Subscription.findById(itemId);
            if (!item) return res.status(404).json({ message: 'Subscription not found.' });
            amount = item.price;
        } else {
            return res.status(400).json({ message: 'Invalid purchase type.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (user.credits < amount) { // Check if user has sufficient credits
            return res.status(400).json({ message: 'Insufficient credits.' });
        }

        // Deduct credits
        user.balance -= amount; // Deduct the cost in dollars
        await user.save();

        // Record the transaction
        const transaction = await Transaction.create({
            pickId: type === 'pick' ? itemId : null,
            packageId: type === 'package' ? itemId : null,
            subscriptionId: type === 'subscription' ? itemId : null,
            userId: req.user.id,
            tnxID: `credits_${new Date().getTime()}`, // Generate a unique ID for credits transactions
            amount: amount,
            method: 'credits',
            status: 'completed',
        });

        await sendPurchaseEmail(user, {
            type,
            itemId,
            tnxID: transaction.tnxID,
            amount: amount,
            method: 'credits',
        });

        res.status(200).json({ success: true, message: 'Payment successful using credits.' });
    } catch (error) {
        console.error('Error during credits purchase:', error.message);
        res.status(500).json({ message: 'Failed to process credits purchase.' });
    }
};