// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    bytes32 public merkleRoot;
    uint256 public activeOn;
    uint256 public fundByDate;
    uint256 public fundingGoal;
    uint256 public minPurchase;
    uint256 public maxPurchase;
    mapping(address => uint256) public purchases;
    mapping(address => bool) public approvedAddresses;
    
    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);
    event AddressApproved(address indexed addr);

    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        bytes32 _merkleRoot,
        uint256 _activeOn,
        uint256 _fundByDate,
        uint256 _fundingGoal,
        uint256 _minPurchase,
        uint256 _maxPurchase
    ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        merkleRoot = _merkleRoot;
        activeOn = _activeOn;
        fundByDate = _fundByDate;
        fundingGoal = _fundingGoal;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
    }

    receive() external payable canBuy(msg.sender, msg.value) notCancelled {
        sellTokens(msg.value);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier canBuy(address _address, uint256 _amount) {
        // Common checks for both receive() and buyTokens()
        require(isAllowed(msg.sender), "Caller is not in the list of allowed addresses");
        require(block.timestamp >= activeOn, "Crowdsale is not active");

        // Calculate token amount based on transaction type
        uint256 tokenAmount;
        if (msg.data.length == 0) {
            // This is a receive() call
            require(msg.value > 0, "Must send ETH");
            tokenAmount = (msg.value * 1e18) / price;
        } else {
            // This is a buyTokens() call
            require(msg.value == (_amount * price) / 1e18, "Amount is not correct");
            tokenAmount = _amount;
        }

        // Common token amount checks
        require(tokenAmount >= minPurchase * 1e18, "Amount is less than the minimum purchase");
        require(tokenAmount <= maxPurchase * 1e18, "Amount is greater than the maximum purchase");
        require(token.balanceOf(address(this)) >= tokenAmount, "Insufficient tokens");
        require(token.transfer(msg.sender, tokenAmount), "Transfer failed");

        _;
    }

    modifier cancelled() {
        require(block.timestamp >= fundByDate && tokensSold < fundingGoal, "Crowdsale is not cancelled");
        _;
    }

    modifier notCancelled() {
        require(block.timestamp <= fundByDate || tokensSold >= fundingGoal, "Crowdsale is cancelled");
        _;
    }

    function buyTokens(uint256 _amount, bytes32[] calldata _proof) public payable canBuy(msg.sender, _amount) notCancelled {
        require(verifyMerkleProof(msg.sender, _proof), "Invalid Merkle proof");
        sellTokens(msg.value);
    }

    function approveAddressWithProof(address _address, bytes32[] calldata _proof) public {
        require(verifyMerkleProof(_address, _proof), "Invalid Merkle proof");
        approvedAddresses[_address] = true;
        emit AddressApproved(_address);
    }

    function claimRefund() public cancelled {
        uint256 amount = purchases[msg.sender];
        require(amount > 0, "No tokens purchased");
        purchases[msg.sender] = 0;
        
        // Calculate ETH amount to refund
        uint256 ethAmount = (amount * price) / 1e18;
        require(address(this).balance >= ethAmount, "Insufficient contract balance");
        
        // Require user to send tokens back
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        
        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        require(sent, "Transfer failed");
    }

    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }

    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function finalize() public onlyOwner {
        require(token.transfer(owner, token.balanceOf(address(this))));

        uint256 value = address(this).balance;
        (bool sent, ) = owner.call{value: value}("");
        require(sent);

        emit Finalize(tokensSold, value);
    }

    function isAllowed(address _address) public view returns (bool) {
        return approvedAddresses[_address];
    }

    function verifyMerkleProof(
        address _address,
        bytes32[] calldata _proof
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encode(_address));
        return MerkleProof.verify(_proof, merkleRoot, leaf);
    }

    function sellTokens(uint256 _amount) private {
        uint256 tokenAmount = (_amount * 1e18) / price;

        tokensSold += tokenAmount;
        purchases[msg.sender] += tokenAmount;
        emit Buy(tokenAmount, msg.sender);
    }
}
