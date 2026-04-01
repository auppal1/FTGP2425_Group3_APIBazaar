const { ethers } = require("ethers");

const{provider} = require('./web3');
const contractABI = require('./contractABI.json');

const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, contractABI, provider);

module.exports = contract;

