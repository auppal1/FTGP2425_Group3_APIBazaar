// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


// FTGP Group 3 - API Bazaar
// Contract creates and tracks individual API contracts, each associated with a provider
// Calls upon APIProviderLogic to instantiate an individual contract, bonding curve, and token.

contract APIBazaarFactory{


    // Creates a new API listing on the marketplace with params given by provider
    // @param name Readable name of API 
    // @param description Readable description of API
    // @param symbol Symbol of API provider
    // @param category Category of API provider
    // @param endpoint Endpoint needed for API gateway layer
    // @param a Bonding curve parameter PLACEHOLDER
    // @param b Bonding curve parameter PLACEHOLDER
    // @param capacity Bonding curve parameter representing the limit of supply
    function createAPIContract(
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
    }

}

