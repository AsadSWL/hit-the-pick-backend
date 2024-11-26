const paypal = require('@paypal/checkout-server-sdk');

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_SECRET
);

// Create a PayPal HTTP Client
const client = new paypal.core.PayPalHttpClient(environment);

// Export the client
module.exports = { client };
