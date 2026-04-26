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
    let registryContractAddress; // the address the contract is deployed to

    // For listing deployer contract
    let APIListingDeployerFactory;
    let APIListingDeployer;
    let listingDeployerAddress;

    // For treasury contract
    let treasuryFactory;
    let platformTreasury;
    let treasuryContractAddress;

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
        registryContractAddress = APIBazaarRegistry.target;
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
        // - in this case the constructor requires the address of the registry contract
        // - it is passed wrapped in double quotes
        APIListingDeployer = await APIListingDeployerFactory.deploy(registryContractAddress);
        // Wait for the contract to finish deploying
        await APIListingDeployer.waitForDeployment();
        // Get the address that the deployer contract has been deployed to - we need this 
        // to test the setDeployer() function in the registry contract
        listingDeployerAddress = APIListingDeployer.target;
        // Console logs
        console.log(`Deployed APIListingDeployer contract to: ${listingDeployerAddress}`);
        // Whitespace before next console log
        console.log();

        // DEPLOY TREASURY CONTRACT
        // Create contract factory
        treasuryFactory = await ethers.getContractFactory("PlatformTreasury");
        // Deploy the contract
        // - in this case the constructor requires the wallet address of the treasury owner
        platformTreasury = await treasuryFactory.deploy(treasuryOwner);
        // Wait for the contract to finish deploying
        await platformTreasury.waitForDeployment();
        // Get the address that the treasury contract has been deployed to - we need this 
        // to test the setTreasury() function in the registry contract
        treasuryContractAddress = platformTreasury.target;
        // Console logs
        console.log(`Deployed PlatformTreasury contract to: ${treasuryContractAddress}`);
        // Whitespace before next console log
        console.log();
    })

    // Tests for the registry contract
    describe("APIBazaarRegistry", function() {
        
        // Test the constructor - it only needs to do one thing
        describe("Constructor", function() {
            // Each test opens with a string saying what "it" should do
            it("Should set the registry admin correctly", async function () {
                // call APIBazaarRegistry contract's getAdmin() function
                const contractOwner = await APIBazaarRegistry.getAdmin();
                // We need to extract the address from the registryOwner object
                // The object itself includes loads of other data
                assert.equal(contractOwner, registryOwner.address);
            })
        })

        // Test the setDeployer() function
        describe("setDeployer", function() {
            it("Should set the address of the APIListingDeployer contract correctly", async function () {
                // call setDeployer() function with the address of the deployer contract
                await APIBazaarRegistry.setDeployer(listingDeployerAddress);
                // Get the deployer contract address from registry contract
                const deployerContractAddress = await APIBazaarRegistry.getDeployer()
                // assert that deployerContractAddress should = deployerContractAddress
                assert.equal(deployerContractAddress, listingDeployerAddress);
            })
        })

        // Test the setDeployer() function
        describe("setTreasury", function() {
            it("Should set the address of the platformTreasury contract correctly", async function () {
                // call setTreasury() function with the address of the treasury contract
                await APIBazaarRegistry.setTreasury(treasuryContractAddress);
                // Get the treasury contract address from registry contract
                const treasuryAddress = await APIBazaarRegistry.getTreasury()
                // assert that treasuryAddress should = treasuryContractAddress
                assert.equal(treasuryAddress, treasuryContractAddress);
            })
        })
    })

    // Tests for the listing deployer contract
    describe("APIListingDeployer", function() {
        
        // Test the constructor - it only needs to do one thing
        describe("Constructor", function() {
            it("Should set the address of the registry contract correctly", async function () {
                // call platformTreasury contract's getOwner() function
                const registryAddress = await APIListingDeployer.getRegistry();
                // Extract address from treasuryOwner object
                assert.equal(registryAddress, registryContractAddress);
            })
        })
    })

    // Tests for the treasury contract
    describe("PlatformTreasury", function() {
        
        // Test the constructor - it only needs to do one thing
        describe("Constructor", function() {
            it("Should set the treasury owner correctly", async function () {
                // call platformTreasury contract's getOwner() function
                const contractOwner = await platformTreasury.getOwner();
                // Extract address from treasuryOwner object
                assert.equal(contractOwner, treasuryOwner.address);
            })
        })

        describe("withdraw", function() {
            it("Should fail if anyone other than treasury owner tries to withdrwaw", async function () {
                // By default on hardhat network all trasactions are sent from accounts[0]
                // ie. registry owner account, not accounts[1] of treasury owner
                // So if we try to withdraw while connected to the registry owner account,
                // rather than treasury owner account, it should fail and revert
                await expect(platformTreasury.withdraw()).to.be.revertedWith("Only owner");
            })

            it("Should fail if there is no money to withdraw", async function() {
                // Call the withdraw function immediately after deployment - 
                // at this point there will be no money in the contract
                // First connent the treasuryOwner account to the platformTreasury contract
                // so that the "Only owner" error won't be triggered
                const treasuryConnection = await platformTreasury.connect(treasuryOwner);
                // Then use the connection to call withdraw()
                await expect(treasuryConnection.withdraw()).to.be.revertedWith(
                    "Nothing to withdraw"
                );
            })

            describe("getBalance", function () {
                it("Should return the current balance of the treasury", async function () {
                    // Call getBalance() immediately after deployment - at this point 
                    // there will be no money in the contract so we expect the balance
                    // to be 0
                    const treasuryBalance = await platformTreasury.getBalance();
                    // Assert that the balance should = 0
                    // As treasuryBalance will be bigNumber data type, convert to string
                    // for the comparison
                    assert.equal(treasuryBalance.toString(), "0");
                })
            })
        })
    })
})