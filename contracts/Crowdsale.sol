// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Token.sol";

contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;
    mapping(address => bool) public allowedAddresses;

    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);

    constructor(Token _token, uint256 _price, uint256 _maxTokens, address[] memory _initialAddresses) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
        for (uint256 i = 0; i < _initialAddresses.length; i++) {
            allowedAddresses[_initialAddresses[i]] = true;
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

        require(token.balanceOf(address(this)) >= _amount);
        require(token.transfer(msg.sender, _amount));

        tokensSold += _amount;
        
        emit Buy(_amount, msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier onlyAllowedAddresses() {
        require(isAllowed(msg.sender), "Caller is not allowed");
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
        allowedAddresses[_address] = true;
    }

    function removeAllowedAddress(address _address) public onlyOwner {
        allowedAddresses[_address] = false;
    }

    function isAllowed(address _address) public view returns (bool) {
        return allowedAddresses[_address];
    }
}
