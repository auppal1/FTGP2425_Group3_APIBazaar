const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const axios = require('axios');
const contract = require('../config/contracts');
const rateLimit = require('express-rate-limit');

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
  keyGenerator: (req) => req.body.walletAddress || req.ip,
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

module.exports = router;