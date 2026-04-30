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
    let providerAddress; // address of API provider
    let user;
    let userAddress; // address of API user

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
        providerAddress = APIProvider.address;
        user = accounts[3];
        userAddress = user.address;

        // Set up token/contract properties for constructor
        tokenName = "RandomToken";
        tokenSymbol = "RNT";
        capacity = 12;
        basePrice = 10;

        // DEPLOY API LISTING CONTRACT
        listingFactory = await ethers.getContractFactory("APIListing");
        // Deploy the contract with name "APIBazaarRegistry"
        APIListing = await listingFactory.deploy(
            providerAddress,
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

    // Function for use in various below tests to calculate expected purchase price of 
    // tokens for all values of supply and amount up to capacity
    function getTestPurchasePrice (amount, supply) {
        // Initialisations
        let purchasePrice;
        // Convert stepPoint to integer so that it will have the same value as
        // in solidity
        // parseInt() rounds down to nearest whole number
        let stepPoint = parseInt(capacity * 90/100);

        if (supply + amount <= stepPoint) {
            // prices are entirely within constant portion of bonding curve
            purchasePrice = basePrice * amount;
        }
        else if (supply >= stepPoint) {
            // pricing is enirely within cubic portion of curve
            // cumulative cubic contribution above current supply
            let overCubicValue = (supply + amount - stepPoint)**4;
            // cumulative cubic contribution between stepPoint and current supply
            let underCubicValue = (supply - stepPoint)**4;
            // total cubic contribution
            let cubicContribution = overCubicValue - underCubicValue;
            // total purchase price = cubic contribution + constant contribution
            purchasePrice = cubicContribution + (basePrice * amount);
        }
        else {
            // if amount crosses stepPoint, find how much amount is over and under stepPoint
            let overAmount = supply + amount - stepPoint;
            let underAmount = amount - overAmount;
            // cumulative cubic contribution toward overPrice
            let overCubicValue = overAmount**4;
            // total overPrice = cubic price contribution + constant price
            let overPrice = overCubicValue + (basePrice * overAmount);
            // calculate price for constant portion of curve
            let underPrice = basePrice * underAmount;  // price of amount under stepPoint
            // total price of minting is the price over the step + price under the step 
            purchasePrice = overPrice + underPrice;
        }
        return purchasePrice;
    }

    function getTestSalePrice (amount, supply) {
        // Initialisations
        let salePrice;
        // round stepPoint down to nearest whole number
        let stepPoint = parseInt(capacity * 90/100);

        if (supply <= stepPoint) {
            // sale prices are entirely within constant portion of curve
            salePrice = basePrice * amount;
        }
        else if (supply - amount >= stepPoint) {
            // sale prices are entirely within cubic portion of curve
            // cumulative cubic contribution before sale
            let beforeCubicValue = (supply - stepPoint)**4;
            // cumulative cubic contribution after sale
            let afterCubicValue = (supply - amount - stepPoint)**4;
            // total cubic contribution
            let cubicContribution = beforeCubicValue - afterCubicValue;
            // total sale price = cubic contribution + constant contribution
            salePrice = cubicContribution + (basePrice * amount);
        }
        else {
            // if amount crosses stepPoint, find out how much is over and under stepPoint
            let overAmount = supply - stepPoint;
            let underAmount = amount - overAmount;
            // calculate sale price for cubic portion of sale
            // cumulative cubic portion before crossing stepPoint
            let beforeCubicValue = overAmount**4;
            // total overPrice = cubic price contribution + constant price contribution
            let overPrice = beforeCubicValue + (basePrice * overAmount);
            // calculate sale price for constant portion of sale
            let underPrice = basePrice * underAmount;
            // total sale price = price above the step + price below the step
            salePrice = overPrice + underPrice;
        }
        return salePrice;
    }

    // Test the constructor
    describe("Constructor", function() {
        it("Should set the provider address correctly", async function () {
            // call APIListing contract's getProvider() function
            const contractProvider = await APIListing.getProvider();
            // Assert that the returned address should = provider address
            assert.equal(contractProvider, providerAddress);
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

        // For buying tokens
        let price;
        let sendValue;
        let excess;
        let excessValue;

        // Let's say the user buys 5 tokens
        const amount = 5;

        beforeEach(async function() {
            // Work out how much money to send to buy the desired amount of tokens
            // with current supply = 0 (second argument)
            price = getTestPurchasePrice(amount, 0);
            sendValue = ethers.parseUnits(price.toString(), "wei");

            // To test what happens if the user sends too much Wei
            excess = price + 1;
            excessValue = ethers.parseUnits(excess.toString(), "wei");

            // connect the user account to the contract
            userConnection = await APIListing.connect(user);
        })

        // TODO: test the requires

        it("Should update the token supply correctly", async function () {
            // first, user buys the tokens
            await userConnection.buyTokens(amount, {value: sendValue});
            // get the new token supply
            supply = await APIListing.getCurrentDaySupply();
            // as we started with a supply of 0, current supply should = amount
            assert.equal(supply, amount);
        })

        it("Should update the API user's balance correctly", async function () {
            // first, user buys the tokens
            await userConnection.buyTokens(amount, {value: sendValue});
            // get the new user balance
            userBalance = await APIListing.getCurrentDayBalance(userAddress);
            // current user balance should = amount
            assert.equal(userBalance, amount);
        })

        it("Should update the contract's reserve balance correctly", async function () {
            // first, user buys the tokens
            await userConnection.buyTokens(amount, {value: sendValue});
            // get the new reserve balance
            reserveBalance = await APIListing.getReserveBalance();
            // as we started with a supply of 0, 
            // current reserve balance should = price paid
            assert.equal(reserveBalance, price);
        })

        it("Should update the user's credits if they send too much WEI", async function () {
            // Send 1 too many WEI
            await userConnection.buyTokens(amount, {value: excessValue});
            // Get the amount credited to the user
            credits = await APIListing.getCredits(userAddress);
            // Assert that the credits should = excess - price
            assert.equal(credits.toString(), (excess - price).toString());
        })
    })

    describe("sellTokens", function() {
        // Initialise variables for re-use in all the sellTokens tests
        let userConnection;
        let supply;
        let userBalance;
        let reserveBalance;
        let credits;

        // For buying/selling tokens
        let buyPrice;
        let sendValue;
        let salePrice;

        // Let's say the user buys 7 tokens
        const buyAmount = 7;
        // then they sell 5 tokens back to the contract
        const saleAmount = 5;

        beforeEach(async function() {
            // Work out how much money to send to buy the desired amount of tokens
            // with current supply = 0 (second argument)
            buyPrice = getTestPurchasePrice(buyAmount, 0);
            sendValue = ethers.parseUnits(buyPrice.toString(), "wei");
            // calculate the expected sale price for saleAmount when supply = buyAmount
            salePrice = getTestSalePrice(saleAmount, buyAmount);

            // connect the user account to the contract
            userConnection = await APIListing.connect(user);
            // user needs to buy the tokens before they can sell them
            // we have already tested the buyTokens() function and found that it works 
            // correctly, passing all its tests, so we can safely use it in this test
            await userConnection.buyTokens(buyAmount, {value: sendValue});
            // user sells their tokens
            await userConnection.sellTokens(saleAmount);
        })

        // TODO: test the requires

        it("Should update the token supply correctly", async function () {
            // get new token supply
            supply = await APIListing.getCurrentDaySupply();
            // For base price of 1, in the constnat portion of the curve, 
            // supply should = amount bought - amount sold
            assert.equal(supply, (buyAmount - saleAmount));
        })

        it("Should update the API user's balance correctly", async function () {
            // get new user balance
            userBalance = await APIListing.getCurrentDayBalance(userAddress);
            // current user balance should = amount bought - amount sold
            assert.equal(userBalance, (buyAmount - saleAmount));
        })

        it("Should update the contract's reserve balance correctly", async function () {
            // get new reserve balance
            reserveBalance = await APIListing.getReserveBalance();
            // current reserve balance should = amount bought - amount sold
            assert.equal(reserveBalance, (buyPrice - salePrice));
        })

        it("Should update the user's credits correctly", async function () {
            // get new user credits
            credits = await APIListing.getCredits(userAddress);
            // User should be credited with the sale price
            assert.equal(credits, salePrice);
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
            // In order to test this we need to buy some tokens so that supply > 0
            // If we leave supply = 0 and simply set amount > capacity it will trigger the 
            // previous require/revert and this test will fail
            
            // Freshly deployed contract, current supply is 0
            let supply = 0;
            // First buy some tokens, let's say 5
            const buyAmount = 5;
            // get amount of WEI to send to the contract to buy the tokens
            let sendValue = getTestPurchasePrice(buyAmount, supply);
            // buy the tokens
            await APIListing.buyTokens(buyAmount, {value: sendValue});

            // Now let's say we want to know the price to buy some more tokens
            // - eg. amount = total API capacity
            const amount = capacity
            await expect(APIListing.getPurchasePrice(amount)).to.be.revertedWith(
                "Amount breaches capacity"
            );
        })

        it("Should should calculate correct purchase price", async function () {
            
            // Set initial value of supply
            let supply = 0;

            // For every possible value of supply and amount up to cpacity:
            while (supply < capacity) {
                for (amount = 1; amount <= capacity - supply; amount++) {
                    // Get the testing purchase pice
                    expectedPrice = getTestPurchasePrice(amount, supply);
                    // Get purchase price calculated by the contract
                    purchasePrice = await APIListing.getPurchasePrice(amount);
                    // Assert that the two should be equal
                    assert.equal(expectedPrice.toString(), purchasePrice.toString());
                }
                // To increment token supply of the contract by 1:
                // reset amount to 1 so that we can buy 1 token
                amount = 1;
                // get amount of WEI to send to the contract to buy the token
                let sendValue = getTestPurchasePrice(amount, supply);
                // buy the token
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
            // Arbitrary amount between 0 and capacity
            // We use parseInt() to ensure the amount is an integer
            const amount = parseInt(capacity/2);
            // Freshly deployed contract so supply = 0, so amount > supply
            await expect(APIListing.getSalePrice(amount)).to.be.revertedWith(
                "Total token supply insufficient."
            );
        })

        it("Should should calculate correct sale price", async function () {
            // Initially the supply of tokens in the contract is 0
            // We need to buy some tokens in order to have tokens to sell to test
            // getSalePrice()
            let initialSupply = 0;
            // To test all posible values of supply and amount we buy all the tokens up to
            // capacity - first get the value we need to send
            let sendValue = getTestPurchasePrice(capacity, initialSupply);
            // buy the tokens
            await APIListing.buyTokens(capacity, {value: sendValue});
            // get supply from the contract
            let supply = parseInt(await APIListing.getCurrentDaySupply());

            // For every possible value of supply and amount up to cpacity:
            while (supply > 0) {
                for (amount = 1; amount <= supply; amount++) {
                    // Get the testing purchase pice
                    expectedPrice = getTestSalePrice(amount, supply);
                    // Get sale price calculated by the contract
                    salePrice = await APIListing.getSalePrice(amount);
                    // Assert that the two should be equal
                    assert.equal(expectedPrice.toString(), salePrice.toString());
                }
                // To decrement token supply of the contract by 1:
                // reset amount to 1 so that we can sell 1 token
                amount = 1;
                // sell the token
                // we have already tested the sellTokens() function and found that it works 
                // correctly, passing all its tests, so we can safely use it in this test
                await APIListing.sellTokens(amount);
                // get the new supply from the contract
                supply = parseInt(await APIListing.getCurrentDaySupply());
            }
        })
    })

    describe("consumeTokens", function() {
        // User must have some tokens to consume, so first connect user account and
        // buy some tokens
        // Only provider can call consumeTokens(), so connect provider account to
        // call/test consumeTokens() function

        // Initialise variables for use in consumeTokens() tests
        let userConnection;
        let providerConnection;
        let reserveBalance;
        let supply;
        let userBalance;
        let providerPercentage;
        let credits;
        
        // For buying tokens
        let price;
        let sendValue;

        // Let's say the user buys 5 tokens and consumes them all
        const amount = 5;

        beforeEach(async function() {
            // Work out how much money to send to buy the desired amount of tokens
            // with current supply = 0 (second argument)
            price = getTestPurchasePrice(amount, 0);
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

        // TODO: test the requires

        it("Should update the contract's reserve balance correctly", async function () {
            // get new reserve balance
            reserveBalance = await APIListing.getReserveBalance();
            // all tokens have been consumed, reserve balance should = 0
            assert.equal(reserveBalance.toString(), "0");
        })

        it("Should update the token supply correctly", async function () {
            // get new token supply
            supply = await APIListing.getCurrentDaySupply();
            // all tokens have been consumed, token supply should = 0
            assert.equal(supply.toString(), "0");
        })

        it("Should update the API user's balance correctly", async function () {
            // get new user balance
            userBalance = await APIListing.getCurrentDayBalance(userAddress);
            // all user's tokens have been consumed, user balance should = 0
            assert.equal(userBalance.toString(), "0");
        })

        it("Should update the last usage day correctly", async function () {
            // We need to test that the last usage day has been set = current day
            // So first call APIListing's currentDay function
            currentDay = await APIListing.currentDay();
            // Then we need to get the last usage day
            lastUsageDay = await APIListing.getLastUsageDay();
            // Assert that the two should be equal
            assert.equal(currentDay, lastUsageDay);
        })

        it("Should split revenues, crediting 95% to provider", async function () {
            // consumeTokens() calls splitRevenues() which credits 95% of the value
            // of the consumed tokens to the API provider
            // splitRevenues() calculates the 5% fee to send to the platform treasury 
            // first, then calculates the provider percentage as: value - fee
            // When solidity calculations return a decimal value solidity ignores 
            // everything after the decimal point, meaning it effectively always rounds 
            // down
            // If the fee is rounded down, provider percentage is effectively rounded up,
            // therefore we need Math.ceil() in the below line order to calculate the 
            // same percentage as solidity
            providerPercentage = Math.ceil(parseInt(sendValue) * (95/100));
            // get new value of provider credits
            credits = await APIListing.getCredits(providerAddress);
            // console logs to check outputs
            //console.log(parseInt(sendValue));
            //console.log(`Provider percentage: ${providerPercentage}`);
            //console.log(`Provider credits: ${credits}`);
            // Assert that provider percentage should = provider credits
            assert.equal(providerPercentage.toString(), credits.toString());
        })
    })

    describe("withdraw", function() {
        // First the user needs to have bought, and sold, some tokens, so that they
        // have some credits to withdraw - so first connect user account and buy, and
        // then sell, some tokens

        // Initialise variables
        let userConnection;
        let credits;

        // Let's say the user buys and sells 5 tokens
        const amount = 5;

        beforeEach(async function() {
            // Work out how much money to send to buy the desired amount of tokens
            // with current supply = 0 (second argument)
            let price = getTestPurchasePrice(amount, 0);
            let sendValue = ethers.parseUnits(price.toString(), "wei");

            // connect the user account to the contract
            userConnection = await APIListing.connect(user);
            // user needs to buy then sell the tokens 
            await userConnection.buyTokens(amount, {value: sendValue});
            await userConnection.sellTokens(amount);
        })

        it("Should reset the user's credits to 0", async function () {
            // user withdraws their money
            await userConnection.withdraw();
            // get new value of user credits
            credits = await APIListing.getCredits(userAddress);
            // credits should be reset to 0
            assert.equal(credits.toString(), "0");
        })

        it("Should send the withdrawn money to the user's address", async function () {
            // If the withdrawal was successful and the user's money was sent to them
            // we excpect the function not to revert with the error "Withdraw failed"
            await expect(APIListing.withdraw()).to.not.be.revertedWith(
                "Withdraw failed"
            );
        })
    })
})
