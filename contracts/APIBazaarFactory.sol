// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// FTGP Group 3 - API Bazaar
// Contract creates and tracks individual API contracts, each associated with a provider
// Calls upon APIProviderLogic to instantiate an individual contract, bonding curve, and token.

// Need to import APIProviderLogic.sol to create contracts within factory
import "./APIProviderLogic.sol";

contract APIBazaarFactory{

    // Marketplace owner
    address public immutable admin;

    // Construct marketplace owner upon contract creation
    constructor(){
        admin = msg.sender;
    }

    // Variable to track total number of listings
    uint256 public totalListings;

    // Array of all API listing addresses created
    address[] private allListingAddresses; 


    // Struct data structure used for mapping API-specific metadata to a unique ID (contract address)
    // @param provider Wallet address of provider
    // @param apiListing Contract address of API listing
    // @param symbol Symbol of API listing
    // @param endpoint Endpoint needed for API gateway layer
    // @param active Indicator of whether API is active or not
    // @param createdAt Timestamp of when API was created
    struct contractData{ 
        address provider;
        address apiListing;
        string name;
        string symbol;
        string endpoint;
        uint256 createdAt;
    }

    // Map API contract address to API specific metadata from struct
    mapping(address => contractData) private listings;

    // Map provider's wallet address to list of all API contract addresses they have created
    mapping(address => address[]) private providerListings;

    // Events
    event createdListing(address indexed provider, address indexed apiListing, string name, string symbol, string endpoint);
    event TerminationQueued(address indexed apiListing);
    event ListingSettled(address indexed apiListing);
    event ParametersQueued(address indexed apiListing, uint256 newBasePrice, uint256 newCapacity, uint256 day);
    
    // Creates a new API listing on the marketplace with params given by provider
    // @param name Readable name of API 
    // @param symbol Symbol of API provider
    // @param endpoint Endpoint needed for API gateway layer
    // @param capacity Bonding curve parameter representing the limit of supply
    // @param basePrice Bonding curve parameter used by APIProviderLogic pricing function
    function createAPIListing(  // TODO: Add option to change time period
        string calldata name, 
        string calldata symbol,
        string calldata endpoint,
        uint256 capacity,
        uint256 basePrice
    ) external {
        
        // Ensure correct inputs for constructing contract
        require(bytes(name).length > 0, "Name Required");
        require(bytes(name).length <= 50, "Name Too Long");
        require(bytes(symbol).length > 0, "Symbol Required");
        require(bytes(symbol).length <= 10, "Symbol Too Long");
        require(bytes(endpoint).length > 0, "Must provide endpoint"); // TODO: at some point figure out what endpoint to use. Is this URL?
        require(bytes(endpoint).length <= 250, "Endpoint Too Long");
        require(capacity > 0, "Capacity must be > 0");
        require(basePrice > 0, "Base Price must be > 0");

        // Call function from APIProviderLogic.sol
        APIProviderLogic apiContract = new APIProviderLogic(msg.sender, address(this), name, symbol, capacity, basePrice);

        // Increment the total listing count
        totalListings += 1;

        // Store contract address from newly created contract
        address apiContractAddress = address(apiContract);

        // Use struct to store metadata of created contract and map to the contract address
        listings[apiContractAddress] = contractData({
            provider: msg.sender,
            apiListing: apiContractAddress,
            name: name,
            symbol: symbol,
            endpoint: endpoint,
            createdAt: block.timestamp
        });

        // Add mapping from provider address to API contract address
        providerListings[msg.sender].push(apiContractAddress);

        // Add contract address to array of all API contract addresses
        allListingAddresses.push(apiContractAddress);

        // Emit creation of new contract
        emit createdListing(msg.sender, apiContractAddress, name, symbol, endpoint);

    }


    // Getter functions
    function getListing(address apiListing) external view returns (contractData memory) {
        require(listings[apiListing].apiListing != address(0), "Zero address");
        return listings[apiListing];
    } 

    function getAllListings() external view returns (address[] memory) {
        return allListingAddresses;
    }

    function getProviderListings(address provider) external view returns (address[] memory) {
        return providerListings[provider];
    }

    function isListingTerminated(address apiListing) external view returns (bool) {
        require(listings[apiListing].apiListing != address(0), "Zero address");
        return APIProviderLogic(payable(apiListing)).isTerminated();
    }

    function settleExpiredCredits(address apiListing) external returns (bool) {

        // Ensure listing exists 
        require(listings[apiListing].apiListing != address(0), "Zero address");

        // Call settlement in APIProviderLogic
        APIProviderLogic(payable(apiListing)).settleDay();
        emit ListingSettled(apiListing);
        return true;
    }

    function getListingParameters (address apiListing) external view returns (
        uint256 capacity,
        uint256 basePrice,
        uint256 pendingCapacity,
        uint256 pendingBasePrice,
        uint256 liveCapacity,
        uint256 liveBasePrice,
        uint256 changeParamsDay
    ){
        require(listings[apiListing].apiListing != address(0), "Zero address");

        APIProviderLogic apiContract = APIProviderLogic(payable(apiListing));
        (uint256 activeCapacity, uint256 activeBasePrice) = apiContract.getActiveParameters();

        return(
            apiContract.capacity(),
            apiContract.basePrice(),
            apiContract.pendingCapacity(),
            apiContract.pendingBasePrice(),
            activeCapacity,
            activeBasePrice,
            apiContract.changeParamsDay()
        );
    } 

    // We want termination only when the next day begins, but cannot run a constant loop. 
    // Instead, make so termination is only allowed when the first person attempts to purchase a token on a new day
    function terminateListing(address apiListing) external returns (bool) {
        // Message sender must have same wallet address as the wallet address associated with the contract wanting to be terminated therefore msg.sender must equal contractData[provider]
        require(listings[apiListing].provider == msg.sender, "Not owner of API listing");
        require(listings[apiListing].apiListing != address(0), "Zero address");
        
        APIProviderLogic apiContract = APIProviderLogic(payable(apiListing));

        // Use the live state of the listing for checks
        require(!apiContract.isTerminated(), "Listing already terminated");
        require(apiContract.terminationDay() == 0, "Listing already queued");

        // Queue / immediately terminate the contract 
        apiContract.queueTermination();
        emit TerminationQueued(apiListing);
        return true;
    }

    // NOTE: THIS MUST BE UPDATED WELL IN THE FRONTEND... OTHERWISE SOMEBODY COULD BE BUYING INTO A DIFFERENT CURVE THAN THEY'RE SEEING
    function changeParameters(address apiListing, uint256 newBasePrice, uint256 newCapacity) external returns (bool) {
        require(listings[apiListing].apiListing != address(0), "Zero address");
        require(listings[apiListing].provider == msg.sender, "Not owner of API listing");

        // Validate param inputs
        require(newCapacity > 0, "Capacity must be greater than 0");
        require(newBasePrice > 0, "Base price must be greater than 0");

        APIProviderLogic apiContract = APIProviderLogic(payable(apiListing));

        // Use live state of the listing for checks
        require(!apiContract.isTerminated(), "Listing terminated");
        require(apiContract.changeParamsDay() == 0, "Parameter change already queued");

        // Queue param change in APIProviderLogic
        apiContract.queueParameterChange(newCapacity, newBasePrice);
        emit ParametersQueued(apiListing, newBasePrice, newCapacity, apiContract.changeParamsDay());

        return true;
    }

    // TODO: Need some method of withdrawing credits and taking a cut
    // Do we want to allow people to withdraw credits? Need frontend to explain how to withdraw credits, and show how many credits they have

    // TODO: How do we deal with refunds? I.e., if provider fails to accept API request, then can we automate refunds via API Gateway calling something in smart contract?


}

