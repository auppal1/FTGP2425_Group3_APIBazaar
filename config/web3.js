const { ethers } = require('ethers');
const { SEPOLIA_RPC_URL } = require('./env');

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
provider.getBlockNumber()
  .then(block => console.log(`Connected to Sepolia ✓ Block: ${block}`))
  .catch(err => console.error('Connection failed:', err.message));

module.exports = { provider };
