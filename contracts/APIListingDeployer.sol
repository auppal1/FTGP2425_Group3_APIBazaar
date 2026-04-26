// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the listing specific contract to deploy contracts
import "./APIListing.sol";

contract APIListingDeployer {

    // Registry allowed to deploy listings
    address public immutable registry;

    // Construct registry address upon deployment
    constructor(address registry_) {
        require(registry_ != address(0), "Zero address");
        registry = registry_;
    }

    // Function to deploy a listing. Used by APIBazaarRegistry interface
    function deployListing (
        address provider,
        address feeRecipient,
        string calldata name,
        string calldata symbol,
        uint256 capacity,
        uint256 basePrice
    ) external returns (address) {
        require(msg.sender == registry, "Only registry can deploy");
        APIListing apiContract = new APIListing(provider, feeRecipient, name, symbol, capacity, basePrice);
        return address(apiContract);
    }

    // Getter functions
    
    function getRegistry() public view returns (address) {
        return registry;
    }
}
