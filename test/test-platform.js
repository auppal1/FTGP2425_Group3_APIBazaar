// Need to import ethers
const {ethers} = require("hardhat");
// We need this in order to use "expect" and "assert" tests
const {expect, assert} = require("chai");
const { N } = require("ethers");

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
    let listingData;
    let listingAddresses;
    let APIListingAddress;

    // Initialise accounts and associated addresses to use for testing
    let registryOwner;
    let registryOwnerAddress; // address of registry owner account
    let treasuryOwner;
    let treasuryOwnerAddress; // address of treasury owner account
    let APIProvider;
    let providerAddress; // address of API provider

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
        providerAddress = APIProvider.address;
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
        platformTreasury = await treasuryFactory.deploy(treasuryOwnerAddress);
        // Wait for the contract to finish deploying
        await platformTreasury.waitForDeployment();
        // Get the address that the treasury contract has been deployed to - we need this 
        // to test the setTreasury() function in the registry contract
        treasuryContractAddress = platformTreasury.target;
        // Console logs
        console.log(`Deployed PlatformTreasury contract to: ${treasuryContractAddress}`);
        // Whitespace before next console log
        console.log();


        // DEPLOY API LISTING CONTRACT
        // Set up token/contract properties for constructor
        tokenName = "RandomToken";
        tokenSymbol = "RNT";
        capacity = 12;
        basePrice = 10;

        listingFactory = await ethers.getContractFactory("APIListing");
        // Deploy the contract with name "APIBazaarRegistry"
        APIListing = await listingFactory.deploy(
            providerAddress,
            treasuryContractAddress,
            tokenName,
            tokenSymbol,
            capacity,
            basePrice
        );
        // Wait for the contract to finish deploying
        await APIListing.waitForDeployment();
        // Get the address that the registry contract has been deployed to
        listingContractAddress = APIListing.target;
        // Console logs to check that this is all doing what we want it to
        console.log(`Deployed APIListing contract to: ${listingContractAddress}`);
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
                await providerConnection.createAPIListing(
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
                // Then get the address and listing data of the new listing for subsequent 
                // tests
                APIListingAddress = listingAddresses[0];
                listingData = await APIBazaarRegistry.getListing(APIListingAddress);
                // Get the time at which the lisitng was created
                createdTime = listingData.createdAt
                // Finally, for this test, assert that 
                // listingAddresses array length should = 1
                assert.equal(listingAddresses.length.toString(), "1");
            })

            it("Should update the provider lisitngs mapping", async function() {
                // There is only 1 provider listing and its address should be the same
                // as the one stored in the allListingAddresses array
                const providerListings = await APIBazaarRegistry.getProviderListings(providerAddress);
                // Assert that treasuryAddress should = treasuryContractAddress
                assert.equal(providerListings, APIListingAddress);
            })

            it("Should update the lisitngs data structure", async function() {
                // Assert that the listing data properties are what we expect them to be
                assert.equal(listingData.provider, providerAddress);
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

    describe("Contract interactions", function() {
        describe("Calling consumeTokens() should split revenues,\
             sending 5% to treasury contract", async function() {
                // Initialise variables for use in consumeTokens() tests
                let userConnection;
                let providerConnection;
                let treasuryPercentage;
                let providerPercentage;
                let credits;
                
                // For buying tokens
                let price;
                let sendValue;

                // Let's say the user buys 5 tokens and consumes them all
                const amount = 5;

                beforeEach(async function() {
                    // Work out how much money to send to buy the desired amount of tokens
                    // via API listing's getPurchasePrice function
                    price = await APIListing.getPurchasePrice(amount);
                    sendValue = ethers.parseUnits(price.toString(), "wei");

                    // connect the user account to the contract
                    userConnection = await APIListing.connect(user);
                    // user needs to buy the tokens before they can consume them
                    await userConnection.buyTokens(amount, {value: sendValue});

                    // connect the provider account to the contract
                    providerConnection = await APIListing.connect(APIProvider);
                    // consume the tokens associated with the user's address
                    await providerConnection.consumeTokens(userAddress, amount);
                })

                it("Should update the balance of the treasury contract", async function() {
                    // consumeTokens() calls splitRevenues() which transfers 5% of the 
                    // value of the consumed tokens to the platform treasury
                    // When solidity calculations return a decimal value solidity ignores 
                    // everything after the decimal point, meaning it effectively always 
                    // rounds down
                    // If the fee is rounded down, we need Math.floor() in the below line 
                    // order to calculate the same percentage as solidity
                    treasuryPercentage = Math.floor(parseInt(sendValue) * (5/100));
                    // Get the treasury's updated balance
                    const treasuryBalance = await platformTreasury.getBalance();
                    // Assert that the balance should = treasury percentage
                    assert.equal(treasuryPercentage.toString(), treasuryBalance.toString());
                    // THIS IMPLICITLY ALSO TESTS THIS ASPECT OF splitRevenues()
                    // FUNCTIONALITY
                })

                it("Should credit 95% of consumed token value to provider", async function () {
                    // consumeTokens() calls splitRevenues() which credits 95% of the value
                    // of the consumed tokens to the API provider
                    // splitRevenues() calculates the 5% fee to send to the platform 
                    // treasury first, then calculates the provider percentage as: 
                    // value - fee
                    // When solidity calculations return a decimal value solidity ignores 
                    // everything after the decimal point, meaning it effectively always 
                    // rounds down
                    // If the fee is rounded down, we need Math.ceil() in the below line 
                    // order to calculate the same percentage as solidity
                    providerPercentage = Math.ceil(parseInt(sendValue) * (95/100));
                    // Before each "it" test we have bought and consumed "amount" tokens
                    // Before the first test 95% of the value of amount should have been
                    // credited to provider
                    // This is the second test another 95% should have been credited to
                    // provider, ie. provider's total creadits should now be 
                    // 2*(95% of value)
                    totalProviderCredits = providerPercentage * 2;
                    // get new value of provider credits
                    credits = await APIListing.getCredits(providerAddress);
                    // Assert that provider percentage should = provider credits
                    assert.equal(totalProviderCredits.toString(), credits.toString());
                    // THIS IMPLICITLY ALSO TESTS THIS ASPECT OF splitRevenues()
                    // FUNCTIONALITY
                })

                it("Should now be possible to withdraw from the treasury", async function() {
                    // First connent the treasuryOwner account to the platformTreasury 
                    // contract so that the "Only owner" error won't be triggered
                    const treasuryConnection = await platformTreasury.connect(treasuryOwner);
                    // Then use the connection to call withdraw()
                    // If the withdrawal is successful we expect withdraw() not to revert
                    // with "Nothing to withdraw" error
                    await expect(treasuryConnection.withdraw()).to.not.be.revertedWith(
                        "Nothing to withdraw"
                    );
                })
            })
    })
})