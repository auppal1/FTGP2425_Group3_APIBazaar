const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const axios = require('axios');
const contract = require('../config/contracts');
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
    const { listingAddress, ...meta } = req.body;
    if (!listingAddress) return res.status(400).json({ error: 'listingAddress required' });
    const all = loadMetadata();
    all[listingAddress.toLowerCase()] = { ...meta, listingAddress };
    saveMetadata(all);
    res.json({ ok: true, listingAddress });
});


// Protected route test
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Access granted - Token verified' });
});

// Health check endpoint
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Map of providers to base URLs
const providerUrls = {
  provider1: 'https://api.provider1.com',
  provider2: 'https://api.provider2.com'
};

// Checking health at specific provider endpoint
router.get('/providers/:provider/health', async (req, res) => {
  const { provider } = req.params;
  const baseUrl = providerUrls[provider];

  if (!baseUrl) {
    return res.status(400).json({error:'Invalid provider'});
  }
try{
  // Assumption providers expose a /health or /status endpoint
  const url = '${baseUrl}/health';
  const response = await axios.get(url);

  return res.status(200).json({
    provider,
    upstreamStatus:'ok',
    upstreamHttpStatus: response.status,
    data: response.data
  });

} catch (error) {
  const status = error.response ? error.response.status : 500;
  return res.status(status).json({
    provider,
    upstreamStatus: 'unreachable',
    details: error.response?.data ||error.message
    });
  }
});

// Rate limiter to prevent abuse
const requestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests to this provider, please try again later.' },
  keyGenerator: (req, res) => req.body.walletAddress || ipKeyGenerator(req, res),
  standardHeaders: true,
  legacyHeaders: false
});


// Request forwarding route
router.post('/request', verifyToken, async (req, res) => {
  const { provider, path, method = 'GET', query = {}, body = {}, walletAddress } = req.body;

  const baseUrl = providerUrls[provider];
  if (!baseUrl) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  try {
    const url = `${baseUrl}${path}`;

    const axiosConfig = {
      method: method.toLowerCase(),
      url,
      params: query,
      data: body
    };

    const response = await axios(axiosConfig);

    // burn token after successful request - implement burn logic here
    try {
      const txn = await contract.consumeTokens(walletAddress, 1); // burn 1 token
      await txn.wait();
    } catch (burnError) {
      console.error('Token burn failed:', burnError);
      return res.status(500).json({
        error: 'Token burn failed, request not processed',
        details: burnError.message
      });
    }

    res.status(response.status).json({
      provider,
      path,
      status: response.status,
      data: response.data
    });
  } catch (error) {
    console.error('Request forwarding error:', error.message);
    const status = error.response ? error.response.status : 500;
    res.status(status).json({
      error: 'Request forwarding failed',
      details: error.response?.data || error.message
    });
  }
});

router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const balance = await contract.getCurrentDayBalance(req.params.walletAddress);
    res.json({ wallet: req.params.walletAddress, balance: balance.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY TEST ROUTE — remove before production!
router.get('/admin/settle', async (req, res) => {
    await runDailySettle();
    res.json({ message: 'Settle job ran' });

});

// Read every listing's off-chain metadata at once
router.get('/metadata', (req, res) => {
    res.json(loadMetadata());
});


module.exports = router;