require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");


// A hardhat task to list available hardhat 'fake' accounts 
// - this task used to be included with hardhat by default
// Tasks can now only be defined directly in hardhat.config file like so
// It used to be possible to create a tasks folder where tasks could be defined
task("accounts", "Prints a list of available hardhat accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address)
  }
})


/** @type import('hardhat/config').HardhatUserConfig */


// const SEPLOIA_RPC_URL = https/etc
// const PRIVATE_KEY = etc458etc77

module.exports = {
  // solidity compiler version pre-populated in config file
  solidity: "0.8.28",


  // default network is hardhat - specify explicitly - not pre-populated
  defaultNetwork: "hardhat",

  // networks added to config file to enable connention to different netorks
  networks: {

    localhost: {
      url: "http://127.0.0.1:8545",
      // every EVM based blockchain network has its own chain ID
      chainId: 31337,
    },
    
  //   sepolia: {
  //     url: SEPLOIA_RPC_URL,
  //     // this is where private keys are entered - in a list of "accounts"
  //     accounts: [PRIVATE_KEY],
  //     // every EVM based blockchain network has its own chain ID
  //     chainId: 11155111,
  // },
  },


  // named accounts added to enable deployment from specific accounts/wallet addresses
  namedAccounts: {
    deployer: {
      default: 0,
      // when deploying on hardhat network use account 1
      31337: 1,
    },
    user: {
      default: 2,
    }
  },
};
