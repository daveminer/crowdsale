// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";

contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    address[] public allowedAddresses;
    uint256 public activeOn;
    uint256 public fundByDate;
    uint256 public fundingGoal;
    uint256 public minPurchase;
    uint256 public maxPurchase;
    mapping(address => uint256) public purchases;
    
    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);

    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens,
        address[] memory _initialAddresses,
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
        activeOn = _activeOn;
        fundByDate = _fundByDate;
        fundingGoal = _fundingGoal;
        minPurchase = _minPurchase;
        maxPurchase = _maxPurchase;
        for (uint256 i = 0; i < _initialAddresses.length; i++) {
            allowedAddresses.push(_initialAddresses[i]);
        }
    }

    receive() external payable canBuy(msg.sender, msg.value) notCancelled {
        sellTokens(msg.value);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier canBuy(address _address, uint256 _amount) {
        require(msg.value == (_amount * price) / 1e18, "Amount is not correct");
        require(isAllowed(msg.sender), "Caller is not in the list of allowed addresses");
        require(block.timestamp >= activeOn, "Crowdsale is not active");
        require(_amount >= minPurchase * 1e18, "Amount is less than the minimum purchase");
        require(_amount <= maxPurchase * 1e18, "Amount is greater than the maximum purchase");
        require(token.balanceOf(address(this)) >= _amount, "Insufficient tokens");
        require(token.transfer(msg.sender, _amount), "Transfer failed");

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

    function buyTokens(uint256 _amount) public payable canBuy(msg.sender, _amount) notCancelled {
        sellTokens(msg.value);
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

    function finalize() public onlyOwner {
        require(token.transfer(owner, token.balanceOf(address(this))));

        uint256 value = address(this).balance;
        (bool sent, ) = owner.call{value: value}("");
        require(sent);

        emit Finalize(tokensSold, value);
    }

    function addAllowedAddress(address _address) public onlyOwner {
        require(!isAllowed(_address), "Address is already in the allowed list");
        allowedAddresses.push(_address);
    }

    function removeAllowedAddress(address _address) public onlyOwner {
        require(isAllowed(_address), "Address is not in the allowed list");
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            if (allowedAddresses[i] == _address) {
                allowedAddresses[i] = allowedAddresses[allowedAddresses.length - 1];
                allowedAddresses.pop();
                break;
            }
        }
    }

    function isAllowed(address _address) public view returns (bool) {
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            if (allowedAddresses[i] == _address) {
                return true;
            }
        }
        return false;
    }

    function allowedAddressesLength() public view returns (uint256) {
        return allowedAddresses.length;
    }

    function sellTokens(uint256 _amount) private {
        uint256 tokenAmount = (_amount * 1e18) / price;

        tokensSold += tokenAmount;
        purchases[msg.sender] += tokenAmount;
        emit Buy(tokenAmount, msg.sender);
    }
}
