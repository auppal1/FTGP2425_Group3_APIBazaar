const { ethers } = require('ethers');
const { provider: web3provider } = require('./web3');
const abi = require('./contractABI.json');

const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) console.warn('⚠️  CONTRACT_ADDRESS not set in .env');

const listingContract = contractAddress
  ? new ethers.Contract(contractAddress, abi, web3provider)
  : null;

module.exports = {
  async getCurrentDayBalance(address) {
    if (!listingContract) throw new Error('Contract address not configured');
    const balance = await listingContract.getCurrentDayBalance(address);
    return balance;
  },

  async consumeTokens(address, amount) {
    if (!listingContract) throw new Error('Contract address not configured');
    const { PRIVATE_KEY } = require('./env');
    const signer = new ethers.Wallet(PRIVATE_KEY, web3provider);
    const contractWithSigner = listingContract.connect(signer);
    return contractWithSigner.consumeTokens(address, amount);
  }
};