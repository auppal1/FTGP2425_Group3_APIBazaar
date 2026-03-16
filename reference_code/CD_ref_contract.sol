// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract EcoToken is ERC20 {

    // Make Math library functions available for use on uint256 variables
    using Math for uint256;


    // VARIABLES

    // Token properties
    string constant tokenName = "EcoToken";
    string constant tokenSymbol = "ECO";

    // Initialise supply
    uint256 _totalSupply = 0; // initial supply is 0

    // Initial token purchase and sale prices are 0
    uint256 public purchasePrice = 0;
    uint256 public salePrice = 0;
    // For use in getHypotheticalPrice() function below
    uint256 public hypotheticalPrice = 0;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Also need a mapping to store user balances
    mapping(address => uint256) private balance;

    // PARAMETERS of the logarithmic BONDING CURVE used to calculate price
    // price = a * ((supply + k).log2()) - b
    uint256 constant a = 5;
    uint256 constant k = 20;
    uint256 constant b = 19;


    // CONSTRUCTOR

    // token name = FirstToken
    // token symbol = FTK
    // don't need the constructor to do anything else
    constructor() ERC20(tokenName, tokenSymbol) {}


    // FUNCTIONS

    // Function to calculate token purchase price using bonding curve
    function getPurchasePrice(uint256 quantity) public returns(uint256) {

        // reset price to 0 so that the contract is only calculating price of new tokens
        purchasePrice = 0;

        // Use a for loop to sum the spot prices of each individual token
        for(uint256 supply = 1 + _totalSupply; supply <= quantity + _totalSupply; supply++) {
            // spot price of individual token
            uint256 spot_price = a * ((supply + k).log2()) - b;
            // add each token's spot price to total price of all requested tokens
            purchasePrice += spot_price;
        }

        return purchasePrice;
    }

    // Function to use bonding curve to calculate current token price a user can expect to
    // receive for selling tokens
    function getSalePrice(uint256 quantity) public returns(uint256) {

        // require that user is not trying to sell more tokens than exist
        require(quantity <= _totalSupply, "That is more than total token supply. Use hypothetical price.");

        // reset sale price to 0
        salePrice = 0;
        // Use a for loop to sum the spot prices of each individual token
        for(uint256 supply = _totalSupply; supply > _totalSupply - quantity; supply--) {
            uint256 spot_price = a * ((supply + k).log2()) - b;
            salePrice += spot_price;
        }

        return salePrice;
    }

    // function that enables a user to determine a price they might hypothetically receive for a
    // quantity of tokens and hypothetical supply (which can be more or less than the actual current
    // total supply) that they can specify
    function getHypotheticalPrice(uint256 quantity, uint256 hypotheticalSupply) public {

        // reset hypothetical price to 0
        hypotheticalPrice = 0;

        // require that user is not trying to sell more tokens than hypothetically exist
        require(quantity <= hypotheticalSupply, "Quantity must be less than or equal to hypothetical suuply");

        // Use a for loop to sum the spot prices of each individual token
        // starting at user-entered 'hypotheticalSupply' and counting down to 'hypotheticalSupply - quantity'
        for(uint256 supply = hypotheticalSupply; supply > hypotheticalSupply - quantity; supply--) {
            uint256 spot_price = a * ((supply + k).log2()) - b;
            hypotheticalPrice += spot_price;
        }
    }

    // Function to mint/enable buying of new tokens
    function buyTokens(uint256 quantity) public payable {

        address recipient = msg.sender; // address to send the bought tokens to

        // require that some tokens are being bought
        require(quantity > 0, "Token quantity must be positive");
        // get the price of the requested quantity of tokens
        purchasePrice = getPurchasePrice(quantity);
        // require that the user has sent enough money
        require(msg.value >= purchasePrice, "Insufficient WEI sent");

        // mint the requested/bought tokens and send them to the user
        _mint(recipient, quantity);
        // update _totalSupply variable
        _totalSupply = totalSupply();
        // and update user's balance
        balance[recipient] = balanceOf(recipient);
        // update the reserve balance of this contract
        reserveBalance += purchasePrice;

        // finally reset purchasePrice to 0 so that the next time the user calls
        // purchasePrice getter function they do not see the value of the last
        // purchase
        purchasePrice = 0;
    }

    // Function to burn/enable selling of tokens
    function sellTokens(uint256 quantity) public {

        address seller = msg.sender; // address selling tokens

        // require that some tokens are being sold
        require(quantity > 0, "Token quantity must be positive");
        // require that the user has enough tokens
        require(balance[seller] >= quantity, "Your balance is insufficient");
        // get the price of the requested quantity of tokens
        salePrice = getSalePrice(quantity);

        // burn the sold tokens
        _burn(seller, quantity);
        // update _totalSupply
        _totalSupply = totalSupply();
        // and update seller's balance
        balance[seller] = balanceOf(seller);

        // pay the seller
        (bool callSuccess, ) = payable(seller).call{value: salePrice}("");
        require(callSuccess, "Payment failed");

        // update the reserve balance of this contract
        reserveBalance -= salePrice;

        // finally reset saleePrice to 0 so that the next time the user calls
        // salePrice getter function they do not see the value of the last
        // sale
        salePrice = 0;
    }

    receive () external payable {
        // setting quantity = 0 will cause buyTokens() function to revert
        uint256 quantity = 0;
        buyTokens(quantity);
    }

    fallback() external payable {
        // setting quantity = 0 will cause buyTokens() function to revert
        uint256 quantity = 0;
        buyTokens(quantity);
    }

}
