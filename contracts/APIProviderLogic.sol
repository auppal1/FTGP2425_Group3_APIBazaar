// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract APIProviderLogic {

    // Metadata
    string public tokenName;
    string public tokenSymbol;
    uint8 public constant decimals = 0;

    // Bonding Curve Parameters
    uint256 public immutable capacity;
    uint256 public immutable basePrice;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Owner as contract needs administrative control
    address public immutable provider;

    // Mapping for withdrawals
    mapping(address => uint256) public credits;

    // Per day supply and balance mappings (as resets every day). UPDATED EVERY TIME TOKEN IS MINTED OR BURNED
    mapping(uint256 => uint256) private supplyByDay; // mapping day to supply of that day
    mapping(uint256 => mapping(address => uint256)) private balanceByDay; // mapping user address to their balance for that day

    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Credited(address indexed to, uint256 value);
    event Withdrawn(address indexed to, uint256 value);
    event Consumed(address indexed user, uint256 amount,  uint256 indexed day);

    // CONSTRUCTOR
    // Initialise parameters based on provider's params set in APIBazaarFactory.sol
    constructor(
        address provider_,
        string memory tokenName_,
        string memory tokenSymbol_,
        uint256 capacity_,
        uint256 basePrice_
        ) {
        // Initialise parameters from APIBazaarFactory.sol
        capacity = capacity_;
        basePrice = basePrice_;
        provider = provider_;
        tokenName = tokenName_;
        tokenSymbol = tokenSymbol_;
    }


    // Number of seconds in a day - used in currentDay() function
    uint256 public constant dailySeconds = 24 * 60 * 60;


    // FUNCTIONS

    // Function for getting the current day
    // Returns the number of days since unix epoch
    function currentDay() public view returns (uint256) {
        return block.timestamp / dailySeconds;
    }

    // View function for supply (by day)
    function getCurrentDaySupply () public view returns (uint256) {
        return supplyByDay[currentDay()];
    }

    // View function for the current balance of a user (by day)
    function getCurrentDayBalance (address user) public view returns (uint256) {
        return balanceByDay[currentDay()][user];
    }


    // Function to calculate token purchase price using bonding curve
    function getPurchasePrice(uint256 amount) public view returns(uint256) {

        // Initialise current day and supply variables 
        uint256 day = currentDay();
        uint256 S = supplyByDay[day];

        // Validate inputs
        require(amount > 0 && amount <= capacity, "Invalid Amount");
        require(S + amount < capacity, "Amount breaches capacity");
        uint256 purchasePrice;


        // Calculate price for requested number of tokens

        // point where curve price ceases to be constant and becomes cubic
        uint256 stepPoint = uint256(capacity * 90/100);

        if (S + amount <= stepPoint) {
            // pricing entirely follows constant portion of curve
            purchasePrice = basePrice * amount;
        }
        else if (S >= stepPoint) {
            // pricing enirely follows cubic portion of curve
            // x**4 is integral of 4*x**3
            uint256 curveValueAfter = (S + amount - stepPoint)**4; // cumulative cubic contribution after supply
            uint256 curveValueBefore = (S - stepPoint)**4;      // cumulatve cubic contribution before supply
            uint256 nonLinearContribution = curveValueAfter - curveValueBefore;

            // Sum the non-linear and constant components
            purchasePrice = nonLinearContribution + (basePrice * amount); // total mint price = non-linear contribution + constant contribution
        }
        else {
            // if amount crosses stepPoint, find how much amount is over and under stepPoint
            uint256 overAmount = S + amount - stepPoint;
            uint256 underAmount = amount - overAmount;

            // calculate price for the cubic portion of mint
            uint256 curveValueAfter = overAmount**4;            // cumulative cubic contribution toward overPrice 
            uint256 overPrice = curveValueAfter + (basePrice * overAmount);    // total overPrice = cubic price contribution + constant price contribution 

            // calculate price for constant portion of mint
            uint256 underPrice = basePrice * underAmount;  // price of amount under stepPoint

            // total price of minting is the price over the step + price under the step 
            purchasePrice = overPrice + underPrice;
        }

        return purchasePrice;
    }

    // Function to calculate current token price a user can expect to receive for
    // selling tokens back to the contract
    function getSalePrice(uint256 amount) public view returns(uint256) {

        // Initialise current day and supply variables 
        uint256 day = currentDay();
        uint256 S = supplyByDay[day];
        uint256 salePrice;

        // validate inputs
        require(amount > 0 && amount <= capacity, "Invalid Amount");
        // require that user is not trying to sell more tokens than exist
        require(amount <= S, "Total token supply insufficient.");

        // Calculate price for requested number of tokens

        // point where curve price ceases to be constant and becomes cubic
        uint256 stepPoint = uint256(capacity * 90/100);

        if (S <= stepPoint) {
            // sale entirely follows constant portion of curve
            salePrice = basePrice * amount;
        }
        else if (S - amount >= stepPoint) {
            // sale entire follows cubic portion of curve
            uint256 curveValueBefore = (S - stepPoint)**4;  // cumulative cubic portion before sale
            uint256 curveValueAfter = (S - amount - stepPoint)**4;  // cumulative cubic portion after sale
            uint256 nonLinearContribution = curveValueBefore - curveValueAfter;

            // sum the non-linear and constant components
            salePrice = nonLinearContribution + (basePrice * amount);   // total burn price = non-linear contribution + constant contribution
        }
        else {
            // if amount crosses stepPoint, find out how much is over and under stepPoint
            uint256 overAmount = S - stepPoint;
            uint256 underAmount = amount - overAmount;

            // calculate payout for cubic portion of sale
            uint256 curveValueBefore = overAmount**4;   // cumulative cubic portion before crossing stepPoint
            uint256 overPrice = curveValueBefore + (basePrice * overAmount);    // total overPrice = cubic price contribution + constant price contribution 

            // calculate payout for constant portion of sale
            uint256 underPrice = basePrice * underAmount;

            // total sale payout = price above the step + price below the step
            salePrice = overPrice + underPrice;
        }

        return salePrice;
    }

    // Function to mint/enable buying of new tokens
    function buyTokens(uint256 amount) public payable {

        // get the current day
        uint256 day = currentDay();

        address recipient = msg.sender; // address to send the bought tokens to

        // require that some tokens are being bought and get price
        require(amount > 0, "Token quantity must be positive");
        uint256 purchasePrice = getPurchasePrice(amount);
        // require that the user has sent enough money
        require(msg.value >= purchasePrice, "Insufficient value sent");

        // update supply and balances by day
        supplyByDay[day] += amount;
        balanceByDay[day][recipient] += amount;
        reserveBalance += purchasePrice;
        emit Transfer(address(0), recipient, amount);

        // refund user if sends more than purchase price 
        uint256 refund = msg.value - purchasePrice;
        if (refund > 0) {
            credits[recipient] += refund;
            emit Credited(recipient, refund);
        }
        
    }
    

    // Function to burn/enable selling of tokens
    function sellTokens(uint256 amount) public {

        // get the current day
        uint256 day = currentDay();

        address seller = msg.sender; // address selling tokens

        // require that some tokens are being sold and that user has enough tokens
        require(amount > 0, "Token quantity must be positive");
        require(balanceByDay[day][seller] >= amount, "Your balance is insufficient");
        
        uint256 salePrice = getSalePrice(amount);
        require(salePrice <= reserveBalance, "Not enough ETH in contract to credit");

        // update supply and balances by day
        supplyByDay[day] -= amount;
        balanceByDay[day][seller] -= amount; 
        emit Transfer(seller, address(0), amount);

        // credit the seller 
        credits[seller] += salePrice;
        emit Credited(seller, salePrice);

        // update the reserve balance of this contract
        reserveBalance -= salePrice;

    }

    // Function for consuming tokens when API call has been accepted
    // Should only be called by the owner of contract (or API gateway), to prevent users consuming other users' tokens
    function consumeTokens (address user, uint256 amount) external returns (bool) {

        // ensure only owner can call this function
        require(msg.sender == provider, "Only provider can consume tokens");

        // get the current day
        uint256 day = currentDay();

        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        // Ensure they have enough balance to consume
        require(balanceByDay[day][user] >= amount, "Insufficient balance to consume");

        // Ensure that amount of credits is not greater than current day supply
        require(supplyByDay[day] >= amount, "Not enough supply");

        // update current day supply and balances
        supplyByDay[day] -= amount;
        balanceByDay[day][user] -= amount;

        emit Transfer(user, address(0), amount);
        emit Consumed(user, amount, day);

        return true;
    }

    function withdraw() external returns (bool) {
        uint256 value = credits[msg.sender];
        require(value > 0, "No credits to withdraw");

        // Update credits to zero before sending
        credits[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: value}("");
        require(sent, "Withdraw failed");
        emit Withdrawn(msg.sender, value);
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
