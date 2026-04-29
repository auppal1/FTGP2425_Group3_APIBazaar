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
    let providerAdress; // address of API provider
    let user;
    let userAddress; // address of API user

    // Money to send to the contract for payable functions that require it
    let sendValue;

    // Initialise token/contract properties for constructor
    let tokenName;
    let tokenSymbol;
    let capacity;
    let basePrice;

    // Stuff to do before testing
    // Strictly speaking we don't need to do all this setup before every single test
    // but some tests do require a "clean" copy of the contract to be deployed
    beforeEach(async function() {

        // Before testing we need to set up some test accounts
        const accounts = await ethers.getSigners();

        // Set up treasury, provider and user accounts and addresses
        treasuryOwner = accounts[1];
        treasuryOwnerAddress = treasuryOwner.address;
        APIProvider = accounts[2];
        providerAdress = APIProvider.address;
        user = accounts[3];
        userAddress = user.address;

        // Set up token/contract properties for constructor
        tokenName = "RandomToken";
        tokenSymbol = "RNT";
        capacity = 12;
        basePrice = 1;

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
        // console.log();
        // console.log(`Deployed APIListing contract to: ${listingContractAddress}`);
        // // Whitespace before next console log
        // console.log();
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

    describe("buyTokens", function() {
        // For these tests we do need a clean deployment each time, so that the 
        // starting supply and balances are always 0

        // Initialise variables for re-use in all the buyTokens tests
        let userConnection;
        let supply;
        let userBalance;
        let reserveBalance;
        let credits;

        // Let's say the user buys 5 tokens
        const amount = 5;

        // Some money needs to be sent to buy the tokens - for base price of 1
        // value to be sent will be 1*amount as we are in the constant protion 
        // of the bonding curve
        const sendValue = ethers.parseUnits(amount.toString(), "wei");

        // To test what happens if the user sends too much Wei
        const excess = amount + 1;
        const excessValue = ethers.parseUnits(excess.toString(), "wei");

        beforeEach(async function() {
            // connect the user account to the contract
            userConnection = await APIListing.connect(user);
            // buy the tokens
            await userConnection.buyTokens(amount, {value: sendValue});
            // get the new token supply, user balance and reserve balance
            supply = await APIListing.getCurrentDaySupply();
            userBalance = await APIListing.getCurrentDayBalance(userAddress);
            reserveBalance = await APIListing.getReserveBalance();
        })

        // TODO: test the requires

        it("Should update the token supply correctly", async function () {
            // as we started with a supply of 0, current supply should = amount
            assert.equal(supply, amount);
        })

        it("Should update the API user's balance correctly", async function () {
            // current user balance should = amount
            assert.equal(userBalance, amount);
        })

        it("Should update the contract's reserve balance correctly", async function () {
            // as we started with a supply of 0, 
            // current reserve balance should = amount*basePrice
            assert.equal(reserveBalance, amount);
        })

        it("Should update the user's credits if they send too much WEI", async function () {
            // Send 1 too many WEI
            await userConnection.buyTokens(amount, {value: excessValue});
            // Get the amount credited to the user
            credits = await APIListing.getCredits(userAddress);
            // Assert that the credits should = excess - amount
            assert.equal(credits.toString(), (excess - amount).toString());
        })
    })

    describe("sellTokens", function() {
        // Initialise variables for re-use in all the sellTokens tests
        let userConnection;
        let supply;
        let userBalance;
        let reserveBalance;
        let credits;

        // Let's say the user buys 7 tokens
        const buyAmount = 7;
        // then they sell 5 tokens back to the contract
        const saleAmount = 5;

        // Some money needs to be sent to buy the tokens - for base price of 1
        // value to be sent will be 1*amount as we are in the constant protion 
        // of the bonding curve
        const sendValue = ethers.parseUnits(buyAmount.toString(), "wei");

        beforeEach(async function() {
            // connect the user account to the contract
            userConnection = await APIListing.connect(user);
            // user needs to buy the tokens before they can sell them
            await userConnection.buyTokens(buyAmount, {value: sendValue});
            await userConnection.sellTokens(saleAmount);
            // get new token supply, user balance, reserve balance, user credits
            supply = await APIListing.getCurrentDaySupply();
            userBalance = await APIListing.getCurrentDayBalance(userAddress);
            reserveBalance = await APIListing.getReserveBalance();
            credits = await APIListing.getCredits(userAddress);
        })

        // TODO: test the requires

        it("Should update the token supply correctly", async function () {
            // For base price of 1, in the constnat portion of the curve, 
            // supply should = amount bought - amount sold
            assert.equal(supply, (buyAmount - saleAmount));
        })

        it("Should update the API user's balance correctly", async function () {
            // current user balance should = amount bought - amount sold
            assert.equal(userBalance, (buyAmount - saleAmount));
        })

        it("Should update the contract's reserve balance correctly", async function () {
            // current reserve balance should = amount bought - amount sold
            assert.equal(reserveBalance, (buyAmount - saleAmount));
        })

        it("Should update the user's credits correctly", async function () {
            // User should be credited with the sale price - for base price of 1, 
            // in the constant portion of the curve, sale price = saleAmount
            assert.equal(credits, saleAmount);
        })
    })

    describe("getPurchasePrice", function() {
        
        // Function to calculate expected price of tokens for all values of supply and
        // amount up to capacity
        function getExpectedPrice (amount, supply) {
            // Initialisations
            let purchasePrice;
            // Convert stepPoint to integer so that it will have the same value as
            // in solidity
            // parseInt() rounds down to nearest whole number - the type-cast to uint256
            // in solidity code of the contract does the same
            let stepPoint = parseInt(capacity * 90/100);

            if (supply + amount <= stepPoint) {
                // pricing entirely follows constant portion of curve
                purchasePrice = basePrice * amount;
            }
            else if (supply >= stepPoint) {
                // pricing enirely follows cubic portion of curve
                // x**4 is integral of 4*x**3
                // cumulative cubic contribution after supply
                let curveValueAfter = (supply + amount - stepPoint)**4;
                // cumulatve cubic contribution before supply
                let curveValueBefore = (supply - stepPoint)**4;
                let nonLinearContribution = curveValueAfter - curveValueBefore;
                // total purchase price = non-linear contribution + constant contribution
                purchasePrice = nonLinearContribution + (basePrice * amount);
            }
            else {
                // if amount crosses stepPoint, find how much amount is over and under stepPoint
                let overAmount = supply + amount - stepPoint;
                let underAmount = amount - overAmount;
                // cumulative cubic contribution toward overPrice
                let curveValueAfter = overAmount**4;
                // total overPrice = cubic price contribution + constant price
                let overPrice = curveValueAfter + (basePrice * overAmount);
                // calculate price for constant portion of mint/purchase
                let underPrice = basePrice * underAmount;  // price of amount under stepPoint
                // total price of minting is the price over the step + price under the step 
                purchasePrice = overPrice + underPrice;
            }

            return purchasePrice;
        }

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
            // TODO
        })

        it("Should should calculate correct purchase price", async function () {
            
            // Set initial values of supply and amount
            let supply = 0;
            let amount = 1;

            // For every possible value of supply and amount up to cpacity:
            while (supply < capacity) {
                for (amount = 1; amount <= capacity - supply; amount++) {
                    // Get the testing purchase pice
                    expectedPrice = getExpectedPrice(amount, supply);
                    // Get purchase price calculated by the contract
                    purchasePrice = await APIListing.getPurchasePrice(amount);
                    // Assert that the two should be equal
                    assert.equal(expectedPrice.toString(), purchasePrice.toString());
                }
                // To increment token supply of the contract by 1:
                // reset amount to 1 so that we can buy 1 token
                amount = 1;
                // get amount of WEI to send to the contract to buy the token
                let sendValue = getExpectedPrice(amount, supply);
                // buy the token
                // we have already tested the buyTokens() function and found that it works 
                // correctly, passing all its tests, so we can safely use it in this test
                await APIListing.buyTokens(amount, {value: sendValue});
                // get the new supply from the contract
                // use parseInt to convert the returned supply from bigInt to Int for use 
                // in the while loop condition
                supply = parseInt(await APIListing.getCurrentDaySupply());
            }
        })
    })

    describe("getSalePrice", function() {
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
            // TODO
        })

        it("Should should calculate correct sale price", async function () {
            // TODO
        })
    })
})
