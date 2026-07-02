/**
 * One-time script: Creates the 3 subscription products + prices in Stripe.
 * 
 * Usage:
 *   1. Put your real STRIPE_SECRET_KEY in Backend/.env
 *   2. Run: node scripts/setup-stripe-products.js
 *   3. Copy the output price IDs into Backend/.env
 */

require('dotenv').config();
const Stripe = require('stripe').default;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const plans = [
  {
    name: 'SNG Pro',
    envVar: 'STRIPE_PRICE_PRO_MONTHLY',
    amount: 999,       // $9.99 in cents
    interval: 'month',
  },
  {
    name: 'SNG Pro Annual',
    envVar: 'STRIPE_PRICE_PRO_ANNUAL',
    amount: 6999,      // $69.99 in cents
    interval: 'year',
  },
  {
    name: 'SNG Pro+',
    envVar: 'STRIPE_PRICE_PRO_PLUS_MONTHLY',
    amount: 1999,      // $19.99 in cents
    interval: 'month',
  },
];

async function setup() {
  console.log('Creating Stripe products and prices...\n');

  for (const plan of plans) {
    const product = await stripe.products.create({
      name: plan.name,
      description: `SnapNGrasp ${plan.name} subscription`,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: 'usd',
      recurring: { interval: plan.interval },
    });

    console.log(`${plan.envVar}=${price.id}`);
  }

  console.log('\n✅ Done! Paste the lines above into your Backend/.env file.');
}

setup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
