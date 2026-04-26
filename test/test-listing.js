// Need to import ethers
const {ethers} = require("hardhat");
// We need this in order to use "expect" and "assert" tests
const {expect, assert} = require("chai");

// describe function takes as arguments a string and a function
// The string is the name of the contract to be tested
// the function could be named and defined first
// but convention is to use an anonymous function
describe("API Listing", function() {

    // Initialise variables for deploying contract before testing
    let listingFactory;
    let APIListing;
    let listingContractAddress; // the address the contract is deployed to

    // Initialise accounts and associated addresses to use for testing
    let treasuryOwner;
    let treasuryOwnerAddress; // address of treasury owner account
    let APIProvider;
    let providerAdress;

    // Initialise token/contract properties for constructor
    let tokenName;
    let tokenSymbol;
    let capacity;
    let basePrice;

    // Stuff to do before testing
    before(async function() {
        // Before testing we need to set up some test accounts
        const accounts = await ethers.getSigners();
        // Set up treasury and API provider accounts
        treasuryOwner = accounts[1];
        treasuryOwnerAddress = treasuryOwner.address;
        APIProvider = accounts[2];
        providerAdress = APIProvider.address;

        // Set up token/contract properties for constructor
        tokenName = "RandomToken";
        tokenSymbol = "RNT";
        capacity = 10;
        basePrice = 100;

        // DEPLOY API LISTING CONTRACT
        listingFactory = await ethers.getContractFactory("APIListing");
        // Deploy the contract with name "APIBazaarRegistry"
        APIListing = await listingFactory.deploy(
            providerAdress,
            treasuryOwnerAddress,
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
        // Whitespace before first console log
        console.log();
        console.log(`Deployed APIListing contract to: ${listingContractAddress}`);
        // Whitespace before next console log
        console.log();
    })

    // Test the constructor
    describe("Constructor", function() {
        it("Should set the provider address correctly", async function () {
            // call APIListing contract's getProvider() function
            const contractProvider = await APIListing.getProvider();
            // Assert that the returned address should = provider address
            assert.equal(contractProvider, providerAdress);
        })

        it("Should set the treasury (fee recipient) address correctly", async function () {
            // call APIListing contract's getFeeRecipient() function
            const feeRecipient = await APIListing.getFeeRecipient();
            // Assert that the returned address should = treasury owner address
            assert.equal(feeRecipient, treasuryOwnerAddress);
        })

        it("Should set the token name correctly", async function () {
            // call APIListing contract's name() function
            const contractTokenName = await APIListing.name();
            // Assert that the returned name should = token name
            assert.equal(contractTokenName, tokenName);
        })

        it("Should set the token symbol correctly", async function () {
            // call APIListing contract's symbol() function
            const contractTokenSymbol = await APIListing.symbol();
            // Assert that the returned symbol should = token symbol
            assert.equal(contractTokenSymbol, tokenSymbol);
        })

        it("Should set the API capacity correctly", async function () {
            // call APIListing contract's getCapacity() function
            const APICapacity = await APIListing.getCapacity();
            // Assert that the returned value should = capacity
            // As the returned value will be of type bigNumber convert both values to
            // string for the comparison
            assert.equal(APICapacity.toString(), capacity.toString());
        })

        it("Should set the base price correcctly", async function () {
            // call APIListing contract's getBasePrice() function
            const contractBasePrice = await APIListing.getBasePrice();
            // Assert that the returned value should = basePrice
            assert.equal(contractBasePrice.toString(), basePrice.toString());
        })
    })

    describe("getPurchasePrice", function() {
        it("Should should fail if requested amount is not greater than 0", async function () {
            const amount = 0;
            await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
                "Invalid Amount"
            );
        })

        it("Should should fail if requested amount is greater than capacity", async function () {
            const amount = capacity + 1;
            await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
                "Invalid Amount"
            );
        })

        it("Should should fail if supply + amount is greater than capacity", async function () {
            // const amount = 0;
            // await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
            //     "Invalid Amount"
            // );
        })

        it("Should should calculate correct purchase price", async function () {
            // const amount = 0;
            // await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
            //     "Invalid Amount"
            // );
        })
    })

    describe("getPurchasePrice", function() {
        it("Should should fail if requested amount is not greater than 0", async function () {
            const amount = 0;
            await expect(APIListing.getSalePrice(amount)).to.be.revertedWith(
                "Invalid Amount"
            );
        })

        it("Should should fail if requested amount is greater than capacity", async function () {
            const amount = capacity + 1;
            await expect(APIListing.getSalePrice(amount)).to.be.revertedWith(
                "Invalid Amount"
            );
        })

        it("Should should fail if amount is greater than supply", async function () {
            // const amount = 0;
            // await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
            //     "Invalid Amount"
            // );
        })

        it("Should should calculate correct sale price", async function () {
            // const amount = 0;
            // await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
            //     "Invalid Amount"
            // );
        })
    })
})