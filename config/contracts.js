const { ethers } = require('ethers');
const { provider: web3provider } = require('./web3');
const { PRIVATE_KEY } = require('./env');
const abi = require('./contractABI.json');

if (!PRIVATE_KEY) console.warn('⚠️  PRIVATE_KEY not set in .env');

// Lazy signer — only constructed when a write is actually needed
let _signer = null;
function getSigner() {
    if (_signer) return _signer;
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set in .env');
    _signer = new ethers.Wallet(PRIVATE_KEY, web3provider);
    return _signer;
}

function getReadContract(listingAddress) {
    if (!listingAddress) throw new Error('listingAddress required');
    return new ethers.Contract(listingAddress, abi, web3provider);
}

function getWriteContract(listingAddress) {
    if (!listingAddress) throw new Error('listingAddress required');
    return new ethers.Contract(listingAddress, abi, getSigner());
}

const contract = {
    getCurrentDayBalance(listingAddress, userAddress) {
        return getReadContract(listingAddress).getCurrentDayBalance(userAddress);
    },
    consumeTokens(listingAddress, userAddress, amount) {
        return getWriteContract(listingAddress).consumeTokens(userAddress, amount);
    }
};

module.exports = { contract };