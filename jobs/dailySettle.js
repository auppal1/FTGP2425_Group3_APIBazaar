const { ethers } = require('ethers');
const cron = require('node-cron');
const { provider } = require('../config/web3');
const { CONTRACT_ADDRESS, PRIVATE_KEY } = require('../config/env');

const REGISTRY_ABI = [
    "function getAllListings() view returns (address[])"
];

const LISTING_ABI = [
    "function settleDay() external"
];

async function runDailySettle() {
    console.log(`[${new Date().toISOString()}] Running daily settle job...`);
    try {
        const signer = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log('Signer ready:', await signer.getAddress());

        const registry = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, signer);
        console.log('Registry address:', CONTRACT_ADDRESS);

        let listings;
        try {
            listings = await registry.getAllListings();
            console.log('Listings found:', listings);
        } catch (err) {
            console.log('No listings registered yet or registry call failed:', err.message);
            return;
        }

        if (!listings || listings.length === 0) {
            console.log('No listings to settle.');
            return;
        }

        for (const listingAddr of listings) {
            console.log('Attempting to settle:', listingAddr);
            try {
                const listing = new ethers.Contract(listingAddr, LISTING_ABI, signer);
                const tx = await listing.settleDay({ value: 0, gasLimit: 200000 });
                await tx.wait();
                console.log(`✅ Settled: ${listingAddr} | tx: ${tx.hash}`);
            } catch (err) {
                console.error(`❌ Failed ${listingAddr}:`, err.message);
            }
        }

        console.log(`[${new Date().toISOString()}] Daily settle complete.`);
    } catch (err) {
        console.error('Daily settle job failed:', err.message);
    }
}

// Runs at 00:00 UTC every day
cron.schedule('0 0 * * *', runDailySettle, { timezone: 'UTC' });
console.log('Daily settle cron job scheduled — runs at 00:00 UTC.');

module.exports = { runDailySettle };