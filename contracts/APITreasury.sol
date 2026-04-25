// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PlatformTreasury {

    // Platform wallet that controls the treasury
    address public immutable owner;

    // Events
    event FundsReceived(address indexed from, uint256 value);
    event Withdrawn(address indexed to, uint256 value);

    // Initialise owner address upon deployment
    constructor(address owner_) {
        require(owner_ != address(0), "Invalid owner address");
        owner = owner_;
    }

    // Allow treasury to receive ETH from listing fees
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // Withdraw all ETH from treasury to owner address
    function withdraw() external {
        require(msg.sender == owner, "Only owner");

        // Ensure there is ETH to withdraw
        uint256 value = address(this).balance;
        require(value > 0, "Nothing to withdraw");

        // Transfer to owner
        (bool success, ) = payable(owner).call{value: value}("");
        require(success, "Withdraw failed");

        emit Withdrawn(owner, value);
    }

    // View function for treasury balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}