require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 3000,
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
};
