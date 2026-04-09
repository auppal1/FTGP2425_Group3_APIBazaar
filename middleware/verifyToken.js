const{contract} = require('../config/contracts');

const verifyToken = async (req, res, next) => {
    const {walletAddress} = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    try{
        const balance = await contract.getCurrentDayBalance(walletAddress);
        if (balance <= On) {
            return res.status(403).json({ error: 'Insufficient token balance' }); // wallet has tokens
        } else {
            return res.status(403).json({ error: 'Access denied: No tokens found' });
        }
    }
    catch(error){
        res.status(500).json({ error: 'Error verifying token' });
    }
};

    module.exports = verifyToken;