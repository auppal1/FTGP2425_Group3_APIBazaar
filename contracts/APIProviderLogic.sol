// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract APIProviderLogic is ERC20 {

    // Make Math library functions available for use on uint256 variables
    using Math for uint256;

    // Bonding Curve Parameters
    uint256 public immutable capacity;
    uint256 public immutable base_price;

    // Initial token purchase and sale prices are 0
    uint256 public purchasePrice = 0;
    uint256 public salePrice = 0;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Owner as contract needs administrative control
    address public provider;

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
    // Initialise parameters based on provider's params set in APIBazaarFactory.sol
    constructor(
        address provider_,
        string memory tokenName_,
        string memory tokenSymbol_,
        uint256 capacity_,
        uint256 base_price_
        ) ERC20(tokenName_, tokenSymbol_) {
        // Initialise parameters from APIBazaarFactory.sol
        capacity = capacity_;
        base_price = base_price_;
        provider = provider_;
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

        // point where curve price ceases to be constant and becomes cubic
        uint256 step_point = uint256(capacity * 90/100);

        if (_totalSupply + amount <= step_point) {
            // pricing function for constant portion of curve
            purchasePrice = base_price * amount;
        }
        else if (_totalSupply + amount > step_point && _totalSupply + amount < capacity) {
            // pricing function for cubic portion
            // x**4 is integral of 4*x**3
            purchasePrice = (_totalSupply + amount - step_point)**4 + (base_price * amount);
        }

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

        // point where curve price ceases to be constant and becomes cubic
        uint256 step_point = uint256(capacity * 90/100);

        if (_totalSupply - amount < step_point && _totalSupply - amount >= 0) {
            salePrice = base_price * amount;
        }
        else if (_totalSupply - amount >= step_point) {
            salePrice = (_totalSupply - amount - step_point)**4 + (base_price * amount);
        }

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
        emit Transfer(address(0), recipient, amount);

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
        emit Transfer(seller, address(0), amount);

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
