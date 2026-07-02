// api/create-checkout-session.js
// Creates a Stripe Checkout session (TEST mode via sk_test_ key in env).
// The secret key lives ONLY in Vercel env vars (STRIPE_SECRET_KEY) — never in client code.

const Stripe = require('stripe');

const PRICE_EUR_CENTS = 995;   // 9,95 €
const SHIP_EUR_CENTS  = 490;   // 4,90 €
const RATE_CHF        = 0.95;  // demo rate, matches the front-end switcher

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { qty = 1, currency = 'EUR', lang = 'fr' } = req.body || {};
    const q    = Math.min(99, Math.max(1, parseInt(qty, 10) || 1));
    const cur  = currency === 'CHF' ? 'chf' : 'eur';
    const unit = cur === 'chf' ? Math.round(PRICE_EUR_CENTS * RATE_CHF) : PRICE_EUR_CENTS;
    const ship = q >= 2 ? 0 : (cur === 'chf' ? Math.round(SHIP_EUR_CENTS * RATE_CHF) : SHIP_EUR_CENTS);
    const fr   = lang === 'fr';

    const origin = req.headers.origin || ('https://' + req.headers.host);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: fr ? 'fr' : 'en',
      line_items: [{
        quantity: q,
        price_data: {
          currency: cur,
          unit_amount: unit,
          product_data: {
            name: fr ? 'OptiClean by Dr. Zac — Bouteille 50ml'
                     : 'OptiClean by Dr. Zac — 50ml bottle',
            description: fr ? 'Nettoyant pour lunettes sans alcool, sans traces'
                            : 'Alcohol-free, streak-free eyewear cleaner',
            images: [origin + '/bottle-product.jpg']
          }
        }
      }],
      shipping_address_collection: {
        allowed_countries: ['FR', 'CH', 'DE', 'IT', 'ES', 'BE', 'NL', 'LU', 'AT', 'PT']
      },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: ship, currency: cur },
          display_name: ship === 0
            ? (fr ? 'Livraison offerte' : 'Free shipping')
            : (fr ? 'Livraison standard 48/72h' : 'Standard shipping 48/72h')
        }
      }],
      success_url: origin + '/merci?session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  origin + '/produit'
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('stripe error:', e && e.message);
    res.status(500).json({ error: 'stripe_error' });
  }
};
