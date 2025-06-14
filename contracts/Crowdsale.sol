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

    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);

    constructor(Token _token, uint256 _price, uint256 _maxTokens, address[] memory _initialAddresses, uint256 _activeOn) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        activeOn = _activeOn;
        for (uint256 i = 0; i < _initialAddresses.length; i++) {
            allowedAddresses.push(_initialAddresses[i]);
        }
    }

    receive() external payable {
        require(isAllowed(msg.sender), "Caller is not in the list of allowed addresses");
        uint256 amount = msg.value / price;
        buyTokens(amount * 1e18);
    }

    function buyTokens(uint256 _amount) public payable {
        require(msg.value == ((_amount / 1e18) * price));
        require(isAllowed(msg.sender), "Caller is not in the list of allowed addresses");
        require(block.timestamp >= activeOn, "Crowdsale is not active");
        require(token.balanceOf(address(this)) >= _amount);
        require(token.transfer(msg.sender, _amount));

        tokensSold += _amount;
        
        emit Buy(_amount, msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
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
}
