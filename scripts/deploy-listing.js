// Need to import ethers
const {ethers} = require("hardhat");

// describe function takes as arguments a string and a function
// The string is the name of the contract to be tested
// the function could be named and defined first
// but convention is to use an anonymous function
async function main() {

    // Initialise variables for deploying contract before testing
    let listingFactory;
    let APIListing;
    let listingContractAddress; // the address the contract is deployed to

    // Initialise accounts and associated addresses to use for testing
    let treasuryOwner;
    let treasuryOwnerAddress; // address of treasury owner account
    let APIProvider;
    let providerAdress;

    // Before testing we need to set up some test accounts
    const accounts = await ethers.getSigners();
    // Set up treasury API provider accounts
    treasuryOwner = accounts[1];
    treasuryOwnerAddress = treasuryOwner.address;
    APIProvider = accounts[2];
    providerAdress = APIProvider.address;

    // DEPLOY API LISTING CONTRACT
    listingFactory = await ethers.getContractFactory("APIListing");
    console.log("Deploying contract APIListing...");
    // Deploy the contract with name "APIBazaarRegistry"
    APIListing = await listingFactory.deploy(
        providerAdress,
        treasuryOwnerAddress,
        "RandomToken",
        "RNT",
        10,
        100
    );
    // Wait for the contract to finish deploying
    await APIListing.waitForDeployment();
    // Get the address that the registry contract has been deployed to
    listingContractAddress = APIListing.target;
    // Console logs to check that this is all doing what we want it to
    // Whitespace before first console log
    console.log();
    console.log(`Deployed APIListing contract to: ${listingContractAddress}`);
    // Whitespace before next console log
    console.log();
}

// Call main function
main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });