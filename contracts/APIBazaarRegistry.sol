// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// FTGP Group 3 - API Bazaar
// File manages the registry and storage of all API listings and their metadata
// Uses an interface for deploying contracts in APIListingDeployer

// Interface so registry can call the deployer
interface IAPIListingDeployer {
    function deployListing (
        address provider,
        address feeRecipient,
        string calldata name,
        string calldata symbol,
        uint256 capacity,
        uint256 basePrice
    ) external returns (address);
}

contract APIBazaarRegistry {

    // Marketplace owner
    address public immutable admin;

    // Deployer contract address
    address public deployer;

    // Treasury contract address
    address public treasury;

    // Construct marketplace owner upon contract creation
    constructor() {
        // TODO: Talk to Abhay... should this be the gateway wallet address?
        admin = msg.sender;
    }

    // Set deployer address after creating registry and deployment contract
    function setDeployer(address deployerAddress) external {
        require(msg.sender == admin, "Only admin");
        require(deployerAddress != address(0), "Zero address");
        deployer = deployerAddress;
    }

    // Set treasury address to be passed to deployer, to be passed to listing, to then take platform fees
    function setTreasury(address treasuryAddress) external {
        require(msg.sender == admin, "Only admin");
        require(treasuryAddress != address(0), "Zero address");
        treasury = treasuryAddress;
    }

    // Store all API listing addresses created
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
        address listingAddress;
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
    event CreatedListing(address indexed provider, address indexed apiListing, string name, string symbol);

    // Create a new API listing on the marketplace with params given by provider
    // @param name Readable name of API 
    // @param symbol Symbol of API
    // @param endpoint Endpoint needed for API gateway layer
    // @param capacity Bonding curve parameter representing the limit of supply
    // @param basePrice Bonding curve parameter representing the base price of an API call
    function createAPIListing( 
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
        require(bytes(endpoint).length > 0, "Must provide endpoint");
        require(bytes(endpoint).length <= 250, "Endpoint Too Long");
        require(capacity > 0, "Capacity must be > 0");
        require(basePrice > 0, "Base Price must be > 0");
        require(deployer != address(0), "Deployer not set");
        require(treasury != address(0), "Treasury not set");

        // Deploy an API listing via APIListingDeployer.sol using deployer contract address + interface
        address apiContractAddress = IAPIListingDeployer(deployer).deployListing(
            msg.sender, treasury, name, symbol, capacity, basePrice
        );

        // Use struct to store metadata of created contract and map to the contract address
        listings[apiContractAddress] = contractData({
            provider: msg.sender,
            listingAddress: apiContractAddress,
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
        emit CreatedListing(msg.sender, apiContractAddress, name, symbol);

    }

    // Getter functions
    function getListing(address listingAddress) external view returns (contractData memory) {
        require(listings[listingAddress].listingAddress != address(0), "Zero address");
        return listings[listingAddress];
    }

    function getAllListings() external view returns (address[] memory) {
        return allListingAddresses;
    }

    function getProviderListings(address provider) external view returns (address[] memory) {
        return providerListings[provider];
    }

    function getAdmin() public view returns (address) {
        return admin;
    }

    function getDeployer() public view returns (address) {
        return deployer;
    }

    function getTreasury() public view returns (address) {
        return treasury;
    }

}