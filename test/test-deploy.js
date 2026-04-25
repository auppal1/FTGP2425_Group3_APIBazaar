// Need to import ethers
const {ethers} = require("hardhat");
// we need this in order to use "expect" and "assert" tests
const {expect, assert} = require("chai");

// describe function takes as arguments a string and a function
// The string is the name of the contract to be tested
// the function could be named and defined first
// but convention is to use an anonymous function
describe("PlatformTreasury", function() {

    let platformTreasuryFactory, platformTreasury
    const treasuryOwner = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

    // Stuff to do before each test
    beforeEach(async function() {
        // Before testing we need to deploy the contract
        platformTreasuryFactory = await ethers.getContractFactory("PlatformTreasury");
        platformTreasury = await platformTreasuryFactory.deploy(treasuryOwner);
        await platformTreasury.waitForDeployment();
    })

    // Each test opens with a string saying what "it" should do
    it("Should set the treasury owner correctly", async  function () {
        
    })
})