// In order to run this script hardhat version 2 should be installed in your working directory
// To install hardhat use command: npm install hardhat  or  yarn add hardhat
// To activate yarn package manager use command: corepack enable
// yarn package manager can be used in place of npm or npx
// To initialise hardhat use command: yarn hardhat --init

// In order to run this script use command: yarn hardhat run scripts/deploy.js
// To deploy to a local hardhat network, first use: yarn hardhat node
// Then in a seperate terminal, run: yarn hardhat run scripts/deploy.js --network localhost


// Order for contract deployment:
// APIBazaarRegistry
// APIListingDeployer
// APITreasury


// Imports

// require is JS import - this line imports ethers from hardhat
// specifically from @nomicfoundation/hardhat-ethers
const {ethers, network} = require("hardhat");


// Main function
async function main() {
  // DEPLOY REGISTRY CONTRACT
  // Set the address of the treasury owner
  //const registryOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  // getContractFactory is ethers function which "manufactures" instances of a compiled 
  // contract
  const registryFactory = await ethers.getContractFactory("APIBazaarRegistry");
  console.log("Deploying contract APIBazaarRegistry...");
  // Deploy the contract using the newly created contract factory
  // - give the deployed contract the name "commentlessStorage"
  const APIBazaarRegistry = await registryFactory.deploy();
  // Wait for the contract to finish deploying
  await APIBazaarRegistry.waitForDeployment();
  // See where the contract has been deployed to 
  // .target gets the address the contract has been deployed to
  console.log(`Deployed APIBazaarRegistry contract to: ${APIBazaarRegistry.target}`);
  // Whitespace before next console log
  console.log();

  // DEPLOY LISTING_DEPLOYER CONTRACT
  // Set the address of the registry contract
  const registryContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  // getContractFactory is ethers function which "manufactures" instances of a compiled 
  // contract
  const APIListingDeployerFactory = await ethers.getContractFactory("APIListingDeployer");
  console.log("Deploying contract APIListingDeployer...");
  // Deploy the contract using the newly created contract factory
  // - give the deployed contract the name "commentlessStorage"
  const APIListingDeployer = await APIListingDeployerFactory.deploy(registryContractAddress);
  // Wait for the contract to finish deploying
  await APIListingDeployer.waitForDeployment();
  // See where the contract has been deployed to 
  // .target gets the address the contract has been deployed to
  console.log(`Deployed APIListingDeployer contract to: ${APIListingDeployer.target}`);
  // Whitespace before next console log
  console.log();

  // DEPLOY TREASURY CONTRACT
  // Set the address of the treasury owner
  const treasuryOwner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  // getContractFactory is ethers function which "manufactures" instances of a compiled 
  // contract
  // - the argument to be passed to getContractFactory() is the name of the contract
  // NOT the name of the file
  const treasuryFactory = await ethers.getContractFactory("PlatformTreasury");
  console.log("Deploying contract PlatformTreasury...");
  // Deploy the contract using the newly created contract factory
  // - give the deployed contract the name "platformTreasury"
  // constructor arguments required by the contract are passed to the deploy()
  // function
  // - in this case the constructor requires the wallet address of the treasury owner
  // - it is passed wrapped in double quotes
  const platformTreasury = await treasuryFactory.deploy(treasuryOwner);
  // Wait for the contract to finish deploying
  await platformTreasury.waitForDeployment();
  // See where the contract has been deployed to 
  // .target gets the address the contract has been deployed to
  console.log(`Deployed PlatformTreasury contract to: ${platformTreasury.target}`);

  // If we want to deploy to sepolia testnet we can try the following code
  // Probably needs debugguing due to annoying, unnecessary changes in ethers 
  // and hardhat
  // Would we need to do this after each contract deployment?
  // if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
  //   console.log("Waiting for block confirmations...");
  //   await platformTreasury.contractDeployTransaction().wait(6);
}


// Call main function
main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });