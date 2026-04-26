// Need to import ethers
const {ethers} = require("hardhat");
// We need this in order to use "expect" and "assert" tests
const {expect, assert} = require("chai");

// describe function takes as arguments a string and a function
// The string is the name of the contract to be tested
// the function could be named and defined first
// but convention is to use an anonymous function
describe("API Bazaar", function() {

    // Initialise variables for deploying contracts before testing

    // For registry contrcat
    let registryFactory;
    let APIBazaarRegistry;

    // For listing deployer contract
    let APIListingDeployerFactory;
    let APIListingDeployer;

    // For treasury contract
    let treasuryFactory;
    let platformTreasury;

    // Initialise accounts to use for testing
    let registryOwner;
    let treasuryOwner;

    // Stuff to do before testing
    before(async function() {

        // Before testing we need to set up the test accounts
        // ethers.getSigners will return whatever is in the accounts section for the 
        // network in hardhat.config.js
        // In the case of default hardhat network it will return the list of 20 "fake"
        // hardhat accounts
        const accounts = await ethers.getSigners();

        // Set up registry and treasury accounts
        registryOwner = accounts[0];
        treasuryOwner = accounts[1];
        //console.log(treasuryOwner.address);

        // Before testing we need to deploy the contracts

        // DEPLOY REGISTRY CONTRACT
        // getContractFactory is ethers function which "manufactures" instances of a compiled 
        // contract
        // - the argument to be passed to getContractFactory() is the name of the contract
        // NOT the name of the file
        registryFactory = await ethers.getContractFactory("APIBazaarRegistry");
        // Deploy the contract using the newly created contract factory
        // - give the deployed contract the name "APIBazaarRegistry"
        APIBazaarRegistry = await registryFactory.deploy();
        // Wait for the contract to finish deploying
        await APIBazaarRegistry.waitForDeployment();
        // Get the address that the registry contract has been deployed to - we need this 
        // to pass it to the constructor of the listing deployer contract 
        // .target gets the address the contract has been deployed to
        const registryContractAddress = APIBazaarRegistry.target;
        // Console logs to check that this is all doing what we want it to
        // Whitespace before first console log
        console.log();
        console.log(`Deployed APIBazaarRegistry contract to: ${registryContractAddress}`);
        // Whitespace before next console log
        console.log();

        // DEPLOY LISTING_DEPLOYER CONTRACT
        // Create contract factory
        APIListingDeployerFactory = await ethers.getContractFactory("APIListingDeployer");
        // Deploy the contract
        // constructor arguments required by the contract are passed to the deploy()
        // function
        // - in this case the constructor requires the wallet address of the treasury owner
        // - it is passed wrapped in double quotes
        APIListingDeployer = await APIListingDeployerFactory.deploy(registryContractAddress);
        // Wait for the contract to finish deploying
        await APIListingDeployer.waitForDeployment();
        // Console logs
        console.log(`Deployed APIListingDeployer contract to: ${APIListingDeployer.target}`);
        // Whitespace before next console log
        console.log();

        // DEPLOY TREASURY CONTRACT
        // Create contract factory
        treasuryFactory = await ethers.getContractFactory("PlatformTreasury");
        // Deploy the contract
        platformTreasury = await treasuryFactory.deploy(treasuryOwner);
        // Wait for the contract to finish deploying
        await platformTreasury.waitForDeployment();
        // Console logs
        console.log(`Deployed PlatformTreasury contract to: ${platformTreasury.target}`);
        // Whitespace before next console log
        console.log();
    })

    // Tests for the treasury contract
    describe("PlatformTreasury", function() {
        
        // Test the constructor - it only needs to do one thing
        describe("Constructor", function() {
            // Each test opens with a string saying what "it" should do
            it("Should set the treasury owner correctly", async function () {
                // call platformTreasury contract's getOwner() function
                const contractOwner = await platformTreasury.getOwner();
                // We need to extract the address from the treasuryOwner object
                // The object itself includes loads of other data
                assert.equal(contractOwner, treasuryOwner.address);
            })
        })
    })
})