const { ethers } = require('ethers');
const { provider: web3provider } = require('./web3');
const { PRIVATE_KEY, CONTRACT_ADDRESS } = require('./env');
const abi = require('./contractABI.json');

if (!CONTRACT_ADDRESS) console.warn('⚠️  CONTRACT_ADDRESS not set in .env');

// Read-only contract instance (used for view calls like getCurrentDayBalance)
const readContract = CONTRACT_ADDRESS
    ? new ethers.Contract(CONTRACT_ADDRESS, abi, web3provider)
    : null;

// Signer-attached instance (used for state-changing calls like consumeTokens)
const signer        = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, web3provider) : null;
const writeContract = (readContract && signer) ? readContract.connect(signer) : null;

// Combined export — exposes both read and write methods on one object
const contract = {
    getCurrentDayBalance(address) {
        if (!readContract) throw new Error('Contract not configured');
        return readContract.getCurrentDayBalance(address);
    },
    consumeTokens(address, amount) {
        if (!writeContract) throw new Error('Signer or contract not configured');
        return writeContract.consumeTokens(address, amount);
    }
};

module.exports = { contract };