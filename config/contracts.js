const { ethers } = require('ethers');
const { provider: web3provider } = require('./web3');
const { PRIVATE_KEY, CONTRACT_ADDRESS } = require('./env');
const abi = require('./contractABI.json');

if (!CONTRACT_ADDRESS) console.warn('⚠️  CONTRACT_ADDRESS not set in .env');
if (!PRIVATE_KEY)      console.warn('⚠️  PRIVATE_KEY not set in .env');

const readContract = CONTRACT_ADDRESS
    ? new ethers.Contract(CONTRACT_ADDRESS, abi, web3provider)
    : null;

// Build the signer-attached contract LAZILY so an invalid PRIVATE_KEY
// only fails calls that actually need to write, not the whole gateway boot.
let _writeContract = null;
function getWriteContract() {
    if (_writeContract) return _writeContract;
    if (!readContract) throw new Error('Contract not configured');
    if (!PRIVATE_KEY)  throw new Error('PRIVATE_KEY not set in .env');
    const signer = new ethers.Wallet(PRIVATE_KEY, web3provider);
    _writeContract = readContract.connect(signer);
    return _writeContract;
}

const contract = {
    getCurrentDayBalance(address) {
        if (!readContract) throw new Error('Contract not configured');
        return readContract.getCurrentDayBalance(address);
    },
    consumeTokens(address, amount) {
        return getWriteContract().consumeTokens(address, amount);
    }
};

module.exports = { contract };