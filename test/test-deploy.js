// Need to import ethers
const {ethers} = require("hardhat");
// We need this in order to use "expect" and "assert" tests
const {expect, assert} = require("chai");

// describe function takes as arguments a string and a function
// The string is the name of the contract to be tested
// the function could be named and defined first
// but convention is to use an anonymous function
describe("PlatformTreasury", function() {

    // Initialise variables for deploying contracts before testing
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

        // Before testing we need to deploy the contract
        treasuryFactory = await ethers.getContractFactory("PlatformTreasury");
        platformTreasury = await treasuryFactory.deploy(treasuryOwner);
        await platformTreasury.waitForDeployment();
    })

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