const paypal = require('@paypal/checkout-server-sdk');
const Transaction = require('../models/transactionModel');
const Package = require('../models/packageModel');
const Subscription = require('../models/subscriptionModel');
const Pick = require('../models/pickModel');

const paypalClient = new paypal.core.PayPalHttpClient(
    new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET)
);

exports.createOrder = async (req, res) => {
    const { type, itemId } = req.body;

    try {
        let item, amount;

        if (type === 'pick') {
            item = await Pick.findById(itemId);
            amount = item.units * 100;
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

        const purchaseUnits = capture?.result?.purchase_units || [];
        const amountValue = purchaseUnits[0]?.payments?.captures[0]?.amount?.value || '0.00';

        await Transaction.create({
            pickId: type === 'pick' ? itemId : null,
            packageId: type === 'package' ? itemId : null,
            subscriptionId: type === 'subscription' ? itemId : null,
            userId: req.user.id,
            tnxID: capture.result.id,
            amount: amountValue,
            status: 'completed',
        });

        res.status(200).json({ message: 'Payment successful.', capture });
    } catch (error) {
        console.error('Error during capture:', error.message);
        res.status(500).json({ message: 'Failed to capture PayPal order.' });
    }
};

