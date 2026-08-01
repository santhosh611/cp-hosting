// restoreClientFunds.js
// Run with: node restoreClientFunds.js
// This script restores all soft-deleted client fund records (isActive: false -> true)

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Register all models so populate() works correctly
require('./models/Site');
require('./models/User');
const SiteFund = require('./models/SiteFund');

async function restoreClientFunds() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!\n');

    // First, show all records (active + inactive)
    const allFunds = await SiteFund.find({}).populate('siteId', 'name');
    console.log(`Total SiteFund records in DB (active + deleted): ${allFunds.length}`);

    const activeFunds = allFunds.filter(f => f.isActive);
    const inactiveFunds = allFunds.filter(f => !f.isActive);

    console.log(`  Active (currently visible): ${activeFunds.length}`);
    console.log(`  Soft-deleted (hidden):      ${inactiveFunds.length}\n`);

    if (inactiveFunds.length === 0) {
      console.log('No soft-deleted records found. Nothing to restore.');
      await mongoose.disconnect();
      return;
    }

    console.log('Soft-deleted records found:');
    inactiveFunds.forEach(f => {
      const siteName = f.siteId?.name || f.siteId || 'Unknown Site';
      console.log(`  - Payment #${f.paymentNumber} | Site: ${siteName} | Amount: ₹${f.amount} | Deleted at: ${f.updatedAt}`);
    });

    // Restore all soft-deleted records
    const result = await SiteFund.updateMany(
      { isActive: false },
      { $set: { isActive: true } }
    );

    console.log(`\n✅ Successfully restored ${result.modifiedCount} client fund record(s)!`);
    console.log('All your client funds data is now visible in the module again.\n');

    // Verify final state
    const finalCount = await SiteFund.countDocuments({ isActive: true });
    console.log(`Total active records now: ${finalCount}`);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

restoreClientFunds();
