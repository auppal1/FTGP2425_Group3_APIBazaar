// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract TokenAPI is ERC20 {

    // Make Math library functions available for use on uint256 variables
    using Math for uint256;


    // VARIABLES

    // Token properties
    string constant tokenName = "TokenAPI";
    string constant tokenSymbol = "TAPI";

    // Initial token purchase and sale prices are 0
    uint256 public purchasePrice = 0;
    uint256 public salePrice = 0;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Per day supply and balance mappings (as resets every day). UPDATED EVERY TIME TOKEN IS MINTED OR BURNED
    mapping(uint256 => uint256) private supplyByDay; // mapping day to supply of that day
    mapping(uint256 => mapping(address => uint256)) private balanceByDay; // mapping user address to their balance for that day

    // Bonding Curve Parameters
    uint256 constant a = 500;
    uint256 constant b = 1;
    uint256 constant k = 0;
    uint256 constant capacity = 200;

    // CONSTRUCTOR

    constructor() ERC20(tokenName, tokenSymbol) {}


    // Number of seconds in a day - used in currentDay() function
    uint256 public constant dailySeconds = 24 * 60 * 60;

    // Set current day and initialise supply for current day
    uint256 day = currentDay();
    uint256 _totalSupply = supplyByDay[day]; // initial daily supply is 0


    // FUNCTIONS

    // Function for getting the current day
    // Returns the number of days since unix epoch
    function currentDay() public view returns (uint256) {
        return block.timestamp / dailySeconds;
    }

    // Function to calculate token purchase price using bonding curve
    function getPurchasePrice(uint256 quantity) public returns(uint256) {

        // reset price to 0 so that the contract is only calculating price of new tokens
        purchasePrice = 0;
        require(_totalSupply + quantity < capacity, "Amount breaches capacity");

        // Use a for loop to sum the spot prices of each individual token
        for (uint256 i = 1; i <= quantity; i++) { // i = 1 as supply is post-mint
            uint256 sNext = _totalSupply + i;
            uint256 denom = capacity + k - sNext;
            purchasePrice += b + (a / denom);
        }

        return purchasePrice;
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
        balanceByDay[day][recipient] = balanceOf(recipient);
        // update the reserve balance of this contract
        reserveBalance += purchasePrice;

        // finally reset purchasePrice to 0 so that the next time the user calls
        // purchasePrice getter function they do not see the value of the last
        // purchase
        purchasePrice = 0;
    }
}
