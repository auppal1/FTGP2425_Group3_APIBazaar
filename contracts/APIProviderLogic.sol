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

    // Bonding Curve Parameters
    uint256 constant a = 500;
    uint256 constant b = 1;
    uint256 constant k = 0;
    uint256 constant capacity = 200;

    // Initial token purchase and sale prices are 0
    uint256 public purchasePrice = 0;
    uint256 public salePrice = 0;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Owner as contract needs administrative control
    address public owner;

    // Mapping for withdrawals
    mapping(address => uint256) public credits;

    // Per day supply and balance mappings (as resets every day). UPDATED EVERY TIME TOKEN IS MINTED OR BURNED
    mapping(uint256 => uint256) private supplyByDay; // mapping day to supply of that day
    mapping(uint256 => mapping(address => uint256)) private balanceByDay; // mapping user address to their balance for that day

    // Events
    event Credited(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Consumed(address indexed user, uint256 amount,  uint256 indexed day);


    // CONSTRUCTOR

    constructor() ERC20(tokenName, tokenSymbol) {
        owner = msg.sender;
    }


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
    function getPurchasePrice(uint256 amount) public returns(uint256) {

        require(amount > 0 && amount <= capacity, "Invalid Amount");
        require(_totalSupply + amount < capacity, "Amount breaches capacity");

        // reset price to 0 so that the contract is only calculating price of new tokens
        purchasePrice = 0;

        // Calculate price for requested number of tokens
        uint256 numerator = capacity + k - _totalSupply;
        uint256 denominator = capacity + k - (_totalSupply + amount);
        purchasePrice = (b*_totalSupply) + a*(((numerator)/(denominator)).log2()) + amount;

        return purchasePrice;
    }

    // Function to calculate current token price a user can expect to receive for
    // selling tokens back to the contract
    function getSalePrice(uint256 amount) public returns(uint256) {

        require(amount > 0 && amount <= capacity, "Invalid Amount");
        // require that user is not trying to sell more tokens than exist
        require(amount <= _totalSupply, "Total token supply insufficient.");

        // reset sale price to 0
        salePrice = 0;

        // Calculate price for requested number of tokens
        uint256 numerator = capacity + k - _totalSupply;
        uint256 denominator = capacity + k - (_totalSupply + amount);
        salePrice = (b*_totalSupply) + a*(((numerator)/(denominator)).log2()) - amount;

        return salePrice;
    }

    // Function to mint/enable buying of new tokens
    function buyTokens(uint256 amount) public payable {

        address recipient = msg.sender; // address to send the bought tokens to

        // require that some tokens are being bought
        require(amount > 0, "Token quantity must be positive");
        // get the price of the requested quantity of tokens
        purchasePrice = getPurchasePrice(amount);
        // require that the user has sent enough money
        require(msg.value >= purchasePrice, "Insufficient WEI sent");

        // mint the requested/bought tokens and send them to the user
        _mint(recipient, amount);
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

    // Function to burn/enable selling of tokens
    function sellTokens(uint256 amount) public {

        address seller = msg.sender; // address selling tokens

        // require that some tokens are being sold
        require(amount > 0, "Token quantity must be positive");
        // require that the user has enough tokens
        require(balanceByDay[day][seller] >= amount, "Your balance is insufficient");
        // get the price of the requested quantity of tokens
        salePrice = getSalePrice(amount);

        // burn the sold tokens
        _burn(seller, amount);
        // update _totalSupply
        _totalSupply = totalSupply();
        // and update seller's balance
        balanceByDay[day][seller] = balanceOf(seller);

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

    function consumeTokens (address user, uint256 amount) external returns (bool) {
        require(msg.sender == owner, "Not owner");
        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        // Ensure they have enough balance to consume
        require(balanceByDay[day][user] >= amount, "Insufficient balance to consume");

        // Ensure that amount of credits is not greater than supply
        require(_totalSupply >= amount, "Not enough supply");

        // Update balances and supply
        balanceByDay[day][user] -= amount;
        supplyByDay[day] -= amount;

        emit Transfer(user, address(0), amount);
        emit Consumed(user, amount, day);

        return true;
    }

    function withdraw() external returns (bool) {
        uint256 amount = credits[msg.sender];
        require(amount > 0, "No credits to withdraw");

        // Update credits to zero before sending
        credits[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Withdraw failed");
        emit Withdrawn(msg.sender, amount);
        return true;
    }

    receive () external payable {
        // setting amount = 0 will cause buyTokens() function to revert
        uint256 amount = 0;
        buyTokens(amount);
    }

    fallback() external payable {
        // setting amount = 0 will cause buyTokens() function to revert
        uint256 amount = 0;
        buyTokens(amount);
    }
}
