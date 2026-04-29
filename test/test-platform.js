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

    // For API listing, once one has been deployed
    let newAPIListing;
    let APIListingAddress; // address of 1 deployed listing
    let listingAddresses; // array of addresses of deployed lsitings
    let listingData; // data structure for lisitngs created on deployment

    // Initialise accounts and associated addresses to use for testing
    let registryOwner;
    let registryOwnerAddress; // address of registry owner account
    let treasuryOwner;
    let treasuryOwnerAddress; // address of treasury owner account
    let APIProvider;
    let providerAdress; // address of API provider
    let user;
    let userAddress; // address of API user

    // Initialise token/contract properties for listing deployment
    let tokenName;
    let tokenSymbol;
    let endpoint;
    let capacity;
    let basePrice;

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
        registryOwnerAddress = registryOwner.address;
        treasuryOwner = accounts[1];
        treasuryOwnerAddress = treasuryOwner.address;
        APIProvider = accounts[2];
        providerAdress = APIProvider.address;
        user = accounts[3];
        userAddress = user.address;

        // BEFORE TESTING WE NEED TO DEPLOY THE CONTRACTS

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

    // TESTS

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
                assert.equal(contractOwner, registryOwnerAddress);
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

        // Test the setTreasury() function
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

        // Test the listing function
        describe("createAPIListing", function () {

            // Set up token/contract properties for new API lisitng
            tokenName = "RandomToken";
            tokenSymbol = "RNT";
            endpoint = "https://API-gateway.etc";
            capacity = 12;
            basePrice = 1;

            // Initialise variables for use in tests
            let providerConnection;
            let createdTime;

            it("Should create a new API listing and update listings array", async function () {
                // API provider should cerate the new listing, so first connect the 
                // provider account to the contract
                providerConnection = await APIBazaarRegistry.connect(APIProvider);
                // create the new listing
                newAPIListing = await providerConnection.createAPIListing(
                    tokenName,
                    tokenSymbol,
                    endpoint,
                    capacity,
                    basePrice
                );
                // If the new listing has been created succsessfully there will be 1 listing 
                // in the allListingAddresses array - its length will be 1
                // So first get the array
                listingAddresses = await APIBazaarRegistry.getAllListings();
                assert.equal(listingAddresses.length.toString(), "1");
                // Get the address and listing data of the new listing for subsequent tests
                APIListingAddress = listingAddresses[0];
                listingData = await APIBazaarRegistry.getListing(APIListingAddress);
                // Get the time at which the lisitng was created
                createdTime = listingData.createdAt
            })

            it("Should update the provider lisitngs mapping", async function() {
                // There is only 1 provider listing and its address should be the same
                // as the one stored in the allListingAddresses array
                const providerListings = await APIBazaarRegistry.getProviderListings(providerAdress);
                // Assert that treasuryAddress should = treasuryContractAddress
                assert.equal(providerListings, APIListingAddress);
            })

            it("Should update the lisitngs data structure", async function() {
                // Assert that the listing data properties are what we expect them to be
                assert.equal(listingData.provider, providerAdress);
                assert.equal(listingData.listingAddress, APIListingAddress);
                assert.equal(listingData.name, tokenName);
                assert.equal(listingData.symbol, tokenSymbol);
                assert.equal(listingData.endpoint, endpoint);
                assert.equal(listingData.createdAt, createdTime);
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
                assert.equal(contractOwner, treasuryOwnerAddress);
            })
        })

        describe("withdraw", function() {
            it("Should fail if anyone other than treasury owner tries to withdrwaw", async function () {
                // By default on hardhat network all transactions are sent from accounts[0]
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