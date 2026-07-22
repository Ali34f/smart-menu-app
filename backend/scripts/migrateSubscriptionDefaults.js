/**
 * One-time migration: ensure every restaurant has subscription.status for billing middleware.
 * Run: `node scripts/migrateSubscriptionDefaults.js` from backend/ (requires MONGODB_URI in .env).
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('restaurants');
  const result = await col.updateMany(
    {
      $or: [{ 'subscription.status': { $exists: false } }, { subscription: { $exists: false } }]
    },
    { $set: { 'subscription.status': 'active' } }
  );
  console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
