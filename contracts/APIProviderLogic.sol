// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract APIProviderLogic is ERC20 {

    // Make Math library functions available for use on uint256 variables
    using Math for uint256;

<<<<<<< HEAD
    // Bonding Curve Parameters
    uint256 public immutable a;
    uint256 public immutable b;
    uint256 public immutable k;
    uint256 public immutable capacity;
=======

    // VARIABLES

    // Token properties
    string constant tokenName = "TokenAPI";
    string constant tokenSymbol = "TAPI";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 1fb4dd4 (Corrected buy and sell pricing equations)
=======
    uint8 public constant decimals = 0;
>>>>>>> 146a7eb (Updated consume, buy and sell functions)
=======

    // Bonding Curve Parameters for equation: price = b + a / (capacity + k - _totalSupply)
    uint256 immutable a;   // determines max price
    uint256 immutable b;   // determines start price
    uint256 immutable k;   // smoothes the curve
    uint256 immutable capacity;    // maximum API capacity
>>>>>>> 1a47ada (Updated buy and sell functions for clarity, modification so curve params are defined by constructor)

    // Initial token purchase and sale prices are 0
    uint256 public purchasePrice = 0;
    uint256 public salePrice = 0;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Owner as contract needs administrative control
<<<<<<< HEAD
    address public provider;
=======
    address public immutable owner;
>>>>>>> 146a7eb (Updated consume, buy and sell functions)

    // Mapping for withdrawals
    mapping(address => uint256) public credits;

    // Per day supply and balance mappings (as resets every day). UPDATED EVERY TIME TOKEN IS MINTED OR BURNED
    mapping(uint256 => uint256) private supplyByDay; // mapping day to supply of that day
    mapping(uint256 => mapping(address => uint256)) private balanceByDay; // mapping user address to their balance for that day

<<<<<<< HEAD
    // Number of seconds in a day - used in currentDay() function
    uint256 public constant dailySeconds = 24 * 60 * 60;

    // Set current day and initialise supply for current day
    uint256 day = currentDay();
    uint256 _totalSupply = supplyByDay[day]; // initial daily supply is 0

=======
>>>>>>> 1a47ada (Updated buy and sell functions for clarity, modification so curve params are defined by constructor)
    // Events
    event Credited(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Consumed(address indexed user, uint256 amount,  uint256 indexed day);

    // CONSTRUCTOR
<<<<<<< HEAD
    // Initialise parameters based on provider's params set in APIBazaarFactory.sol
    constructor(
        address provider_,
        string memory tokenName_, 
        string memory tokenSymbol_, 
        uint256 a_, 
        uint256 b_, 
        uint256 k_, 
        uint256 capacity_
        ) ERC20(tokenName_, tokenSymbol_) {
        // Initialise parameters from APIBazaarFactory.sol
        a = a_;
        b = b_;
        k = k_;
        capacity = capacity_;
        provider = provider_;
=======

    constructor(uint256 _a, uint256 _b, uint256 _k, uint256 _capacity) ERC20(tokenName, tokenSymbol) {
        owner = msg.sender;
        // Negative a & b mean negative ETH per token, negative k will result in math errors
        // and capacity cannot be too small
        require(_a > 0 && _b > 0 && _k > 0 && _capacity > 1, "Invalid params");
        a = _a;
        b = _b;
        k = _k;
        capacity = _capacity;
>>>>>>> 1a47ada (Updated buy and sell functions for clarity, modification so curve params are defined by constructor)
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
        purchasePrice = (b*amount) + a*(((numerator)/(denominator)).log2());

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
        uint256 numerator = capacity + k - (_totalSupply - amount);
        uint256 denominator = capacity + k - _totalSupply;
        salePrice = (b*amount) + a*(((numerator)/(denominator)).log2());

        return salePrice;
    }

    // Function to mint/enable buying of new tokens
    function buyTokens(uint256 amount) public payable {

        address recipient = msg.sender; // address to send the bought tokens to

        // require that some tokens are being bought and get price
        require(amount > 0, "Token quantity must be positive");
        purchasePrice = getPurchasePrice(amount);
        // require that the user has sent enough money
        require(msg.value >= purchasePrice, "Insufficient WEI sent");

        // mint the requested/bought tokens and send them to the user
        // update token supply and balances
        _mint(recipient, amount);
        _totalSupply = totalSupply();
        balanceByDay[day][recipient] = balanceOf(recipient);
        reserveBalance += purchasePrice;

        // finally reset purchasePrice to 0 so that the next time the user calls
        // purchasePrice getter function they do not see the value of the last
        // purchase
        purchasePrice = 0;
    }

    // Function to burn/enable selling of tokens
    function sellTokens(uint256 amount) public {

        address seller = msg.sender; // address selling tokens

        // require that some tokens are being sold and that user has enough tokens
        require(amount > 0, "Token quantity must be positive");
        require(balanceByDay[day][seller] >= amount, "Your balance is insufficient");

        salePrice = getSalePrice(amount);

        // burn the sold tokens, update balance and supply
        _burn(seller, amount);
        _totalSupply = totalSupply();
        balanceByDay[day][seller] = balanceOf(seller);

        // pay the seller
        (bool callSuccess, ) = payable(seller).call{value: salePrice}("");
        require(callSuccess, "Payment failed");

        // update the reserve balance of this contract
        reserveBalance -= salePrice;

        // finally reset salePrice to 0 so that the next time the user calls
        // salePrice getter function they do not see the value of the last
        // sale
        salePrice = 0;
    }

    function consumeTokens (address user, uint256 amount) external returns (bool) {
        require(msg.sender == provider, "Not owner");
        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        // Ensure they have enough balance to consume
        require(balanceByDay[day][user] >= amount, "Insufficient balance to consume");

        // Ensure that amount of credits is not greater than supply
        require(_totalSupply >= amount, "Not enough supply");

        // burn consumed tokens, update balance and supply
        _burn(user, amount);
        _totalSupply = totalSupply();
        balanceByDay[day][user] = balanceOf(user);

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
