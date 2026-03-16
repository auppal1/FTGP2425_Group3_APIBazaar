// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TokenAPI {
    
    // Contract implements an ERC-20 token that can be exchanged for an API call to the contract owner

    // Token Metadata
    string public name = "TokenAPI";
    string public symbol = "TAPI";
    uint8 public constant decimals = 0;
    
    // Bonding curve params
    uint256 public immutable a;
    uint256 public immutable b;
    uint256 public immutable capacity; //denotes capacity therefore vertical asymptote of curve

    // Owner as contract needs administrative control
    address public owner;

    // Mapping for withdrawals
    mapping(address => uint256) public credits;

    // Maximum mint / burn limit (as cost calculation is loop therefore gas increases at O(amount))
    uint256 public immutable maxAmount;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Credited(address indexed to, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Consumed(address indexed user, uint256 amount,  uint256 indexed day);

    // Constructor for params and owner
    constructor(uint256 _a, uint256 _b, uint256 _capacity, uint256 _maxAmount) {
        // Negative a & b mean negative ETH per token, and capacity cannot be too small
        require(_a > 0 && _b > 0 && _capacity > 1, "Invalid params"); 
        a = _a;
        b = _b;
        capacity = _capacity;
        owner = msg.sender;
        maxAmount = _maxAmount;
    }

    // Number of seconds in a day
    uint256 public constant dailySeconds = 24 * 60 * 60;

    // Function for getting the current day
    // Returns the number of days since unix epoch
    function currentDay() public view returns (uint256) {
        return block.timestamp / dailySeconds;
    }

    // Per day supply and balance mappings (as resets every day). UPDATED EVERY TIME TOKEN IS MINTED OR BURNED
    mapping(uint256 => uint256) private supplyByDay; // mapping day to supply of that day
    mapping(uint256 => mapping(address => uint256)) private balanceByDay; // mapping address to balance of that day


    // ERC-20-like functions PER DAY
    function balanceOf(address user) public view returns (uint256) {
        return balanceByDay[currentDay()][user];
    }

    function totalSupply() public view returns (uint256) {
        return supplyByDay[currentDay()];
    }

    // Token is not transferable to prevent speculative behaviour
    function transfer(address, uint256) public pure returns (bool) {
        revert("No transfers");
    }

    function transferFrom(address, address, uint256) public pure returns (bool) {
        revert("No transfers");
    }

    // Minting function for the current day
    function mint(uint256 amount) external payable returns (bool) {
        // Check if amount is valid
        require(amount > 0 && amount <= maxAmount, "Invalid Amount");

        uint256 day = currentDay();
        uint256 S = supplyByDay[day];

        // Calculate discrete cost of minting with looped summation
        uint256 C = capacity;
        require(S + amount < C, "Amount breaches capacity");
        uint256 cost = 0;
        for (uint256 i = 1; i <= amount; i++) { // i = 1 as supply is post-mint
            uint256 sNext = S + i;
            uint256 denom = C - sNext;
            cost += b + (a / denom); 
        }
        // Ensure user has ETH to mint
        require(msg.value >= cost, "Insufficient ETH");

        // Update supply and balances
        supplyByDay[day] = S + amount;
        balanceByDay[day][msg.sender] += amount;
        emit Transfer(address(0), msg.sender, amount);

        // Update user's credits 
        uint256 excess = msg.value - cost;
        if (excess > 0) {
            credits[msg.sender] += excess;
            emit Credited(msg.sender, excess);
        }
        
        return true;
    }

    // Burning function for the current day
    function burn(uint256 amount) external returns (bool) {
        // Check if amount is valid
        require(amount > 0 && amount <= maxAmount, "Invalid Amount");
        
        // Ensure user has enough credits to burn
        uint256 day = currentDay();
        uint256 userBalance = balanceByDay[day][msg.sender];
        require(userBalance >= amount, "Insufficient Balance");

        // Calculate burning cost
        uint256 S = supplyByDay[day];
        uint256 C = capacity;
        require(S >= amount, "Not enough supply");
        uint256 refund = 0;
        for (uint256 i = 0; i < amount; i++) { // i = 0 as supply is pre-burn
            uint256 sNext = S - i;
            uint256 denom = C - sNext;
            refund += b + (a / denom);
        }

        // Update supply and balances
        balanceByDay[day][msg.sender] = userBalance - amount;
        supplyByDay[day] = S - amount;
        emit Transfer(msg.sender, address(0), amount);

        // Update user's credits
        credits[msg.sender] += refund;
        emit Credited(msg.sender, refund);

        return true;
    }

    function consumeTokens (address user, uint256 amount) external returns (bool) {
        require(msg.sender == owner, "Not owner");
        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        // Ensure they have enough balance to consume
        uint256 day = currentDay();
        uint256 userBalance = balanceByDay[day][user];
        require(userBalance >= amount, "Insufficient balance to consume");

        // Ensure that amount of credits is not greater than supply
        uint256 S = supplyByDay[day];
        require(S >= amount, "Not enough supply");

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

    function quoteMint(uint256 amount) public view returns (uint256) {
        require(amount > 0 && amount <= maxAmount, "Invalid Amount");

        // Using same math as mint()
        uint256 day = currentDay();
        uint256 S = supplyByDay[day];
        uint256 C = capacity;
        require(S + amount < C, "Amount breaches capacity");
        uint256 cost = 0;
        for (uint256 i = 1; i <= amount; i++) { // i = 1 as supply is post-mint
            uint256 sNext = S + i;
            uint256 denom = C - sNext;
            cost += b + (a / denom); 
        }
        return cost;
    }

    function quoteBurn(uint256 amount) public view returns (uint256) {
        require(amount > 0 && amount <= maxAmount, "Invalid Amount");

        // Using same math as burn()
        uint256 day = currentDay();
        uint256 S = supplyByDay[day];
        require(S >= amount, "Not Enough Supply to Burn");
        uint256 C = capacity;
        uint256 refund = 0;
        for (uint256 i = 0; i < amount; i++) { // i = 0 as supply is pre-burn
            uint256 sNext = S - i;
            uint256 denom = C - sNext;
            refund += b + (a / denom);
        }
        return refund;
    }
}

