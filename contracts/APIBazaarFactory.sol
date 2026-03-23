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
        bool active;
        uint256 createdAt;
    }

    // Map API contract address to API specific metadata from struct
    mapping(address => contractData) private listings;

    // Map provider's wallet address to list of all API contract addresses they have created
    mapping(address => address[]) private providerListings;

    // Event for creation of listing
    event createdListing(address indexed provider, address indexed apiListing, string name);
    
    // Creates a new API listing on the marketplace with params given by provider
    // @param name Readable name of API 
    // @param symbol Symbol of API provider
    // @param endpoint Endpoint needed for API gateway layer
    // @param capacity Bonding curve parameter representing the limit of supply
    // @param basePrice Bonding curve parameter representing the constant price of API call before quartic increase
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
        APIProviderLogic apiContract = new APIProviderLogic(msg.sender, name, symbol, capacity, basePrice); // TODO: APIProviderLogic constructor must match these params

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
            active: true,
            createdAt: block.timestamp
        });

        // Add mapping from provider address to API contract address
        providerListings[msg.sender].push(apiContractAddress);

        // Add contract address to array of all API contract addresses
        allListingAddresses.push(apiContractAddress);

        // Emit creation of new contract
        emit createdListing(msg.sender, apiContractAddress, name);

    }

    function getListing(address apiListing) external view returns (contractData memory) {
        return listings[apiListing];
    } 

    function getAllListings() external view returns (address[] memory) {
        return allListingAddresses;
    }

    function getProviderListings(address provider) external view returns (address[] memory) {
        return providerListings[provider];
    }

    // function terminateListing(address apiListing) external returns (bool) {
        // TODO: create function that terminates API listing
        // Need to implement some way of ensuring that contract can only be terminated at the start of next time period / refresh
    // }

    // function changeParameters(address provider, uint256 param1, uint256 param2, uint256 capacity) external returns (bool) {
        // TODO: create function that allows provider to change parameters. 
        // Need to ensure that this cannot change mid time period
    // }

}

