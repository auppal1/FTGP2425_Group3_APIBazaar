const{contract} = require('../config/contracts');


const verifyToken = async (req, res, next) => {
    const {walletAddress, listingAddress} = req.body;


    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    if (!listingAddress) {
        return res.status(400).json({ error: 'Listing address is required' });
    }
    try{
        const balance = await contract.getCurrentDayBalance(listingAddress, walletAddress);
        if (balance <= 0n) {
            return res.status(403).json({ error: 'Access denied: No tokens found'  }); // wallet has tokens
        }
        next();
    }
    catch(error){
        console.error({'verifyToken error': error.message});
        res.status(500).json({ error: 'Error verifying token' });
    }
};

module.exports = verifyToken;