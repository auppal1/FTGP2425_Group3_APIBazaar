// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract APIListing {

    // Metadata
    string public tokenName;
    string public tokenSymbol;
    uint8 public constant decimals = 0;

    // Bonding Curve Parameters
    uint256 public capacity;
    uint256 public basePrice;

    // Initialise balance of ETH stored in this contract
    uint256 public reserveBalance = 0;  //initial balance is 0

    // Owner as contract needs administrative control
    address public immutable provider;

    // Need platform wallet address to take fees
    address public immutable feeRecipient;

    // Tracks the last day settlement logic was processed
    uint256 public lastSettledDay;

    // Tracks the last day of marketplace usage / activity
    uint256 public lastUsageDay;

    // State variables for terminating listings
    uint256 public terminationDay = 0;      // 0 termination day means no termination has been queued
    bool public terminated;

    // State variables for changing parameters
    uint256 public changeParamsDay = 0;    // 0 change params day means no param changes have been queued
    uint256 public pendingBasePrice;
    uint256 public pendingCapacity;

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
    event TerminationQueued();
    event ListingTerminated();
    event ParametersQueued(uint256 basePrice, uint256 capacity, uint256 changeParamsDay);
    event ParametersChanged(uint256 basePrice, uint256 capacity);
    event FeePaid(address indexed treasury, uint256 amount);
    

    // Number of seconds in a day - used in currentDay() function
    uint256 public constant dailySeconds = 24 * 60 * 60;

    // Function for getting the current day
    // Returns the number of days since unix epoch
    function currentDay() public view returns (uint256) {
        return block.timestamp / dailySeconds;
    }

    // CONSTRUCTOR
    // Initialise parameters based on provider's params set in APIBazaarRegistry.sol
    constructor(
        address provider_,
        address feeRecipient_,
        string memory tokenName_,
        string memory tokenSymbol_,
        uint256 capacity_,
        uint256 basePrice_
        ) {
        // Initialise parameters from APIBazaarRegistry.sol
        provider = provider_;
        feeRecipient = feeRecipient_;
        tokenName = tokenName_;
        tokenSymbol = tokenSymbol_;
        capacity = capacity_;
        basePrice = basePrice_;

        // Construct last active day on contract instantiation
        lastSettledDay = currentDay();
    }

    // FUNCTIONS

    // Fee taking logic: Is called whenever provider is credited therefore revenue is realised 
    // That is either consuming tokens, or settling expired credits during newDayProcess()
    function splitRevenues(uint256 amount) internal {
        
        // Ensure amount is some positive amount
        if (amount == 0) {
            return;
        }

        // Calculate the fee (SET AT 5%)
        uint256 fee = (amount * 5) / 100;
        uint256 providerAmount = amount - fee;

        // Credit the provider with their share
        if (providerAmount > 0) {
            credits[provider] += providerAmount;
            emit Credited(provider, providerAmount);
        } 

        // Transfer treasury fee
        if (fee > 0) {
            (bool sent, ) = payable(feeRecipient).call{value: fee}("");
            require(sent, "Fee transfer failed");
            emit FeePaid(feeRecipient, fee);
        }
    }

    // Function that queues a termination that should be activated in the next stale day 
    function queueTermination () external {
        require(msg.sender == provider, "Only provider can call function");
        require(terminationDay == 0, "Termination already queued");
        require(!isTerminated(), "Contract already terminated");
        
        // Immediately terminate only if there has been no usage this day
        if (lastUsageDay < currentDay()) {

            // settle old reserves
            newDayProcess();

            // update states
            terminated = true;
            emit ListingTerminated();
        }

        // Otherwise, queue termination for tomorrow
        else {
            terminationDay = currentDay() + 1;
            emit TerminationQueued();
        }
    }

        // Function that indicates whether the contract has been terminated or not
    function isTerminated() public view returns (bool) {
        if (terminated) {
            return true;
        }
        if (terminationDay != 0 && currentDay() >= terminationDay) {
            return true;
        }
        return false;
    }

    // Function to queue a parameter change
    function queueParameterChange(uint256 newCapacity, uint256 newBasePrice) external {
        require(msg.sender == provider, "Only provider can call function");
        require(!isTerminated(), "Contract has been terminated");
        require(changeParamsDay == 0, "Parameter change has already been queued");

        // enforce adequate parameter values 
        require(newCapacity > 0, "Capacity must be > 0");
        require(newBasePrice > 0, "Base Price must be > 0");

        // update pending param values
        pendingCapacity = newCapacity;
        pendingBasePrice = newBasePrice;
        changeParamsDay = currentDay() + 1;
        emit ParametersQueued(pendingBasePrice, pendingCapacity, changeParamsDay);
    }

    function getActiveParameters() public view returns (uint256 activeCapacity, uint256 activeBasePrice) {
        if (changeParamsDay != 0 && currentDay() >= changeParamsDay) {
            return (pendingCapacity, pendingBasePrice);
        }
        return(capacity, basePrice);
    }

    // Function to handle all updates at the start of the new day to be called at the start of all state changing functions
    // Includes: splitting expired token credits (reserves) between provider and treasury, updating termination states, updating param states
    function newDayProcess() internal {

        // Get the current day
        uint256 day = currentDay();

        // If we are now in a new day (greater than the last settled day)
        if (lastSettledDay < day) {
            uint256 expiredReserves = reserveBalance;
            reserveBalance = 0;

            // If termination queued, switch terminated to true once the termination day has been reached.
            if (!terminated && terminationDay != 0 && day >= terminationDay) {
                terminated = true;
                terminationDay = 0;
                emit ListingTerminated();
            }

            // If param change queued, change params
            if (changeParamsDay != 0 && day >= changeParamsDay) {
                capacity = pendingCapacity;
                basePrice = pendingBasePrice;
                emit ParametersChanged(pendingBasePrice, pendingCapacity);

                // Reset param change states
                changeParamsDay = 0;
                pendingCapacity = 0;
                pendingBasePrice = 0;
            }

            // CRUCIAL: to make sure the day we track keeps updating, set lastSettledDay to the current day 
            lastSettledDay = day;

            // If there are leftover reserves, then split the fees among treasury and provider
            if (expiredReserves > 0) {  
                splitRevenues(expiredReserves);        
            }
        }
    } 

    // Function can be called by gateway or frontend periodically to manually transfer expired credits to provider
    function settleDay() external {
        newDayProcess();
    }

    // Function to calculate token purchase price using bonding curve
    function getPurchasePrice(uint256 amount) public view returns(uint256) {

        // Initialise current day and supply variables 
        uint256 day = currentDay();
        uint256 S = supplyByDay[day];

        // Initialise purchase price variable
        uint256 purchasePrice;

        // Get active parameters, to accomodate for parameter changes that have just come into effect
        (uint256 activeCapacity, uint256 activeBasePrice) = getActiveParameters();

        // Validate inputs
        require(amount > 0 && amount <= activeCapacity, "Invalid Amount");
        require(S + amount <= activeCapacity, "Amount breaches capacity");

        // Calculate price for requested number of tokens

        // point where curve price ceases to be constant and becomes cubic
        uint256 stepPoint = uint256(activeCapacity * 90/100);

        if (S + amount <= stepPoint) {
            // pricing entirely follows constant portion of curve
            purchasePrice = activeBasePrice * amount;
        }
        else if (S >= stepPoint) {
            // pricing enirely follows cubic portion of curve
            // x**4 is integral of 4*x**3
            uint256 curveValueAfter = (S + amount - stepPoint)**4; // cumulative cubic contribution after supply
            uint256 curveValueBefore = (S - stepPoint)**4;      // cumulatve cubic contribution before supply
            uint256 nonLinearContribution = curveValueAfter - curveValueBefore;

            // Sum the non-linear and constant components
            purchasePrice = nonLinearContribution + (activeBasePrice * amount); // total mint price = non-linear contribution + constant contribution
        }
        else {
            // if amount crosses stepPoint, find how much amount is over and under stepPoint
            uint256 overAmount = S + amount - stepPoint;
            uint256 underAmount = amount - overAmount;

            // calculate price for the cubic portion of mint
            uint256 curveValueAfter = overAmount**4;            // cumulative cubic contribution toward overPrice 
            uint256 overPrice = curveValueAfter + (activeBasePrice * overAmount);    // total overPrice = cubic price contribution + constant price contribution 

            // calculate price for constant portion of mint
            uint256 underPrice = activeBasePrice * underAmount;  // price of amount under stepPoint

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

        // Initialise sale price variable
        uint256 salePrice;

        // Get active parameters, to accomodate for parameter changes that have just come into effect
        (uint256 activeCapacity, uint256 activeBasePrice) = getActiveParameters();

        // validate inputs
        require(amount > 0 && amount <= activeCapacity, "Invalid Amount");
        // require that user is not trying to sell more tokens than exist
        require(amount <= S, "Total token supply insufficient.");

        // Calculate price for requested number of tokens

        // point where curve price ceases to be constant and becomes cubic
        uint256 stepPoint = uint256(activeCapacity * 90/100);

        if (S <= stepPoint) {
            // sale entirely follows constant portion of curve
            salePrice = activeBasePrice * amount;
        }
        else if (S - amount >= stepPoint) {
            // sale entirely follows cubic portion of curve
            uint256 curveValueBefore = (S - stepPoint)**4;  // cumulative cubic portion before sale
            uint256 curveValueAfter = (S - amount - stepPoint)**4;  // cumulative cubic portion after sale
            uint256 nonLinearContribution = curveValueBefore - curveValueAfter;

            // sum the non-linear and constant components
            salePrice = nonLinearContribution + (activeBasePrice * amount);   // total burn price = non-linear contribution + constant contribution
        }
        else {
            // if amount crosses stepPoint, find out how much is over and under stepPoint
            uint256 overAmount = S - stepPoint;
            uint256 underAmount = amount - overAmount;

            // calculate payout for cubic portion of sale
            uint256 curveValueBefore = overAmount**4;   // cumulative cubic portion before crossing stepPoint
            uint256 overPrice = curveValueBefore + (activeBasePrice * overAmount);    // total overPrice = cubic price contribution + constant price contribution 

            // calculate payout for constant portion of sale
            uint256 underPrice = activeBasePrice * underAmount;

            // total sale payout = price above the step + price below the step
            salePrice = overPrice + underPrice;
        }

        return salePrice;
    }

    // Function to mint/enable buying of new tokens
    function buyTokens(uint256 amount) public payable returns (bool) {

        // Ensure contract has not been terminated:
        require(!isTerminated(), "Contract has been terminated");

        // Process day rollover logic before continuing
        newDayProcess();

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

        // update the day there has been usage
        lastUsageDay = day;

        // refund user if sends more than purchase price 
        uint256 refund = msg.value - purchasePrice;
        if (refund > 0) {
            credits[recipient] += refund;
            emit Credited(recipient, refund);
        }
        return true;     
    }

    // Function to burn/enable selling of tokens
    function sellTokens(uint256 amount) public returns (bool) {

        // Ensure contract has not been terminated:
        require(!isTerminated(), "Contract has been terminated");

        // Process day rollover logic before continuing
        newDayProcess();

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

        // update the day there has been usage
        lastUsageDay = day;

        // credit the seller 
        credits[seller] += salePrice;
        emit Credited(seller, salePrice);

        // update the reserve balance of this contract
        reserveBalance -= salePrice;

        return true;

    }

    // Function for consuming tokens when API call has been accepted
    // Should only be called by the owner of contract (or API gateway), to prevent users consuming other users' tokens
    function consumeTokens (address user, uint256 amount) external returns (bool) {

        // Ensure contract has not been terminated:
        require(!isTerminated(), "Contract has been terminated");

        // ensure only owner can call this function
        require(msg.sender == provider, "Only provider can consume tokens");

        // Process day rollover logic before continuing
        newDayProcess();
        
        // get the current day
        uint256 day = currentDay();

        require(user != address(0), "Zero address");
        require(amount > 0, "Amount must be > 0");

        // Ensure they have enough balance to consume
        require(balanceByDay[day][user] >= amount, "Insufficient balance to consume");

        // Ensure that amount of tokens is not greater than current day supply
        require(supplyByDay[day] >= amount, "Not enough supply");

        // reduce reserves by value that has been removed 
        uint256 consumePrice = getSalePrice(amount);
        require(consumePrice <= reserveBalance, "Not enough reserves");
        reserveBalance -= consumePrice;

        // update current day supply and balances
        supplyByDay[day] -= amount;
        balanceByDay[day][user] -= amount;

        // update the day there has been usage
        lastUsageDay = day;

        // consuming tokens => revenue realised (as the reserves are no longer backing tokens)
        // therefore, split the realised revenue among provider and treasury
        splitRevenues(consumePrice);
        
        emit Transfer(user, address(0), amount);
        emit Consumed(user, amount, day);

        return true;
    }

    function withdraw() external returns (bool) {

        // Process day rollover logic before continuing
        newDayProcess();

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

    // Getter functions

    function name() public view returns (string memory) {
        return tokenName;
    }

    function symbol() public view returns (string memory) {
        return tokenSymbol;
    }

    // View function for supply (by day)
    function getCurrentDaySupply() public view returns (uint256) {
        return supplyByDay[currentDay()];
    }

    // View function for the current balance of a user (by day)
    function getCurrentDayBalance(address user) public view returns (uint256) {
        return balanceByDay[currentDay()][user];
    }

    function getCredits(address user) public view returns (uint256) {
        return credits[user];
    }

    function getCapacity() public view returns (uint256) {
        return capacity;
    }

    function getBasePrice() public view returns (uint256) {
        return basePrice;
    }

    function getReserveBalance() public view returns (uint256) {
        return reserveBalance;
    }

    function getChangeParamsDay() public view returns (uint256) {
        return changeParamsDay;
    }

    function getPendingBasePrice() public view returns (uint256) {
        return pendingBasePrice;
    }

    function getPendingCapacity() public view returns (uint256) {
        return pendingCapacity;
    }

    function getLastSettledDay() public view returns (uint256) {
        return lastSettledDay;
    }

    function getLastUsageDay() public view returns (uint256) {
        return lastUsageDay;
    }

    function getTerminationDay() public view returns (uint256) {
        return terminationDay;
    }

    function getTerminationStatus() public view returns (bool) {
        return terminated;
    }

    function getProvider() public view returns (address) {
        return provider;
    }

    function getFeeRecipient() public view returns (address) {
        return feeRecipient;
    }
}
