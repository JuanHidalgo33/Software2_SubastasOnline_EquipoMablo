require('dotenv/config');
const { createHmac, randomUUID } = require('node:crypto');

const args = process.argv.slice(2);
const paymentOrderId = args[0];
const result = args[1] && !args[1].startsWith('--') ? args[1] : 'SUCCESSFUL';
const eventIndex = args.indexOf('--event');
const eventId = eventIndex >= 0 ? args[eventIndex + 1] : `evt-${randomUUID()}`;
const badSignature = args.includes('--bad-signature');

if (!paymentOrderId) {
  console.error('Usage: npm run gateway:pay -- <paymentOrderId> [SUCCESSFUL|FAILED] [--event <id>] [--bad-signature]');
  process.exit(1);
}

const secret = process.env.PAYMENT_WEBHOOK_SECRET;
if (!secret) {
  console.error('PAYMENT_WEBHOOK_SECRET is not set in .env');
  process.exit(1);
}

const url = `http://localhost:${process.env.PORT ?? 3000}/api/v1/payments/webhook`;
const body = JSON.stringify({ eventId, paymentOrderId, result });
const signingKey = badSignature ? 'not-the-real-secret' : secret;
const signature = `sha256=${createHmac('sha256', signingKey).update(body).digest('hex')}`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
  body,
})
  .then(async (response) => {
    console.log(`POST ${url}`);
    console.log(`eventId: ${eventId}`);
    console.log(`HTTP ${response.status}`, await response.text());
  })
  .catch((error) => {
    console.error('Could not reach the API:', error.message);
    process.exit(1);
  });
