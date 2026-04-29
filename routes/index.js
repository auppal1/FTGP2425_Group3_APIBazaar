const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const axios = require('axios');
const { contract } = require('../config/contracts');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { runDailySettle } = require('../jobs/dailySettle');

const fs = require('fs');
const pathLib = require('path');
const METADATA_FILE = pathLib.join(__dirname, '../data/listings.json');

function loadMetadata() {
    try { return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8')); }
    catch { return {}; }
}
function saveMetadata(data) {
    fs.mkdirSync(pathLib.dirname(METADATA_FILE), { recursive: true });
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
}

// Save (or update) a single listing's metadata after it's been deployed
router.post('/metadata', (req, res) => {
    const { listingAddress, endpoint, ...meta } = req.body;
    if (!listingAddress) return res.status(400).json({ error: 'listingAddress required' });
    if (!endpoint || !/^https?:\/\//.test(endpoint)) {
        return res.status(400).json({ error: 'valid endpoint URL required' });
    }
    const all = loadMetadata();
    all[listingAddress.toLowerCase()] = { ...meta, endpoint, listingAddress };
    saveMetadata(all);
    res.json({ ok: true, listingAddress });
});

// Read every listing's off-chain metadata at once
router.get('/metadata', (req, res) => {
    res.json(loadMetadata());
});


// Protected route test
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Access granted - Token verified' });
});

// Health check endpoint
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rate limiter to prevent abuse
const requestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests to this provider, please try again later.' },
  keyGenerator: (req, res) => {
    const wallet = req.body?.walletAddress;
    const listing = req.body?.listingAddress;
    if (wallet && listing) return `${listing}:${wallet}`;
    return ipKeyGenerator(req,res);
  },
  standardHeaders: true,
  legacyHeaders: false
});




router.post('/request', requestLimiter, verifyToken, async (req, res) => {
  const { listingAddress, path = '', method = 'GET', query = {}, body = {}, walletAddress } = req.body;

  // Resolve upstream URL from the metadata store
  const all = loadMetadata();
  const meta = all[listingAddress.toLowerCase()];
  if (!meta || !meta.endpoint) {
    return res.status(400).json({ error: 'Listing has no registered endpoint' });
  }

  const url = `${meta.endpoint}${path}`;

  try {
    const response = await axios({
      method: method.toLowerCase(),
      url,
      params: query,
      data: method.toLowerCase() === 'get' ? undefined : body,
      timeout: 10000
    });

    // Burn one token after successful upstream response
    try {
      const txn = await contract.consumeTokens(listingAddress, walletAddress, 1);
      await txn.wait();
    } catch (burnError) {
      console.error('Token burn failed:', burnError);
      return res.status(500).json({
        error: 'Upstream succeeded but token burn failed',
        details: burnError.message
      });
    }

    res.status(response.status).json({
      listingAddress,
      path,
      status: response.status,
      data: response.data
    });
  } catch (error) {
    console.error('Request forwarding error:', error.message);
    const status = error.response ? error.response.status : 502;
    res.status(status).json({
      error: 'Request forwarding failed',
      details: error.response?.data || error.message
    });
  }
});

router.get('/balance/:listingAddress/:walletAddress', async (req, res) => {
  try {
    const balance = await contract.getCurrentDayBalance(
      req.params.listingAddress,
      req.params.walletAddress
    );
    res.json({
      listing: req.params.listingAddress,
      wallet: req.params.walletAddress,
      balance: balance.toString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY TEST ROUTE — remove before production!
router.get('/admin/settle', async (req, res) => {
    await runDailySettle();
    res.json({ message: 'Settle job ran' });

});




module.exports = router;