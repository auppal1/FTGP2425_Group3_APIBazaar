// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


// FTGP Group 3 - API Bazaar
// Contract creates and tracks individual API contracts, each associated with a provider
// Calls upon APIProviderLogic to instantiate an individual contract, bonding curve, and token.

contract APIBazaarFactory{

    // Struct data structure used for mapping API-specific metadata to a unique ID (contract address)
    // @param provider Wallet address of provider
    // @param apiListing Contract address of API listing
    // @param symbol Symbol of API listing
    // @param category Category of API listing
    // @param endpoint Endpoint needed for API gateway layer
    // @param active Indicator of whether API is active or not
    // @param createdAt Timestamp of when API was created
    struct contractData{ 
        address provider;
        address apiListing;
        string name;
        string description;
        string symbol;
        string category;
        string endpoint;
        bool active;
        uint256 createdAt;
    }

    // Map API contract address to API specific metadata from struct
    mapping(address => contractData) private listings;

    // TODO: create mapping from wallet address to all contracts they have created

    // Event for creation of listing
    event createdListing(address indexed provider, address indexed apiListing, string name, string category);
    
    // Creates a new API listing on the marketplace with params given by provider
    // @param name Readable name of API 
    // @param description Readable description of API
    // @param symbol Symbol of API provider
    // @param category Category of API provider
    // @param endpoint Endpoint needed for API gateway layer
    // @param a Bonding curve parameter PLACEHOLDER
    // @param b Bonding curve parameter PLACEHOLDER
    // @param capacity Bonding curve parameter representing the limit of supply
    function createAPIListing(
        string calldata name, 
        string calldata description,
        string calldata symbol,
        string calldata category, 
        string calldata endpoint,
        uint256 a,
        uint256 b,
        uint256 capacity
    ) external {
        
        // TODO: Change parameters when bonding curve defined
        // Ensure correct inputs for constructing contract
        require(bytes(name).length > 0, "Name Required");
        require(bytes(name).length <= 50, "Name Too Long");
        require(bytes(description).length > 0, "Description Required");
        require(bytes(description).length <= 250, "Description Too Long");
        require(bytes(symbol).length > 0, "Symbol Required");
        require(bytes(symbol).length <= 10, "Symbol Too Long");
        require(bytes(category).length > 0, "Category Required");
        require(bytes(category).length <= 50, "Category Too Long");
        require(bytes(endpoint).length > 0, "Must provide endpoint"); // TODO: at some point figure out what endpoint to use. Is this URL?
        require(bytes(endpoint).length <= 250, "Endpoint Too Long");
        require(a > 0, "Parameter 'a' must be > 0"); // TODO: update according to bonding curve
        require(b > 0, "Parameter 'b' must be > 0"); // TODO: update according to bonding curve
        require(capacity > 0, "Capacity must be > 0"); // TODO: update according to bonding curve

        // TODO: Call the contract from APIProviderLogic.sol once written to create new API listing
        // TODO: Return data from calling contract such as contract address that is unique identifier of contract
    }

    function terminateListing(address apiListing) external returns (bool) {
        // TODO: create function that terminates API listing
        // Need to implement some way of ensuring that contract can only be terminated at the start of next time period / refresh
    }

    function listingCount(address provider) external view returns (uint256) {
        // TODO: create function that view how many listings a specific wallet address has
        // Need mapping from wallet address to listings
    }

    function changeParameters(address provider, uint256 param1, uint256 param2, uint256 capacity) external returns (bool) {
        // TODO: create function that allows provider to change parameters. 
        // Need to ensure that this cannot change mid time period
    }

}

