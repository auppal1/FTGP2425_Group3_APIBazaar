const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

router.get('/protected', verifyToken, (req, res) => {
    res.json({ message: 'Access granted - Token verified' });
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.post('/request', (req, res) => res.json({ message: 'Token check TBD' }));
router.get('/balance/:walletAddress', (req, res) =>
  res.json({ wallet: req.params.walletAddress, balance: 'stub TBD' })
);



module.exports = router;
