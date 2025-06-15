// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC1363} from "@openzeppelin/contracts/token/ERC20/extensions/ERC1363.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20FlashMint} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract OZepCrowdsale is ERC20, ERC1363, ERC20Permit, ERC20FlashMint, Ownable {
    uint256 public price;
    uint256 public tokensSold;

    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 ethRaised);
    
    constructor(address recipient, address initialOwner, uint256 _price)
        ERC20("OZep", "OZ")
        ERC20Permit("OZep")
        Ownable(initialOwner)
    {
        price = _price;
    }

    receive() external payable canBuy((msg.value * 1e18) / price) {
        transferTokens(msg.value);
    }

    function buyTokens(uint256 _amount) public payable canBuy(_amount) {
        transferTokens(msg.value);
    }

    function finalize() public onlyOwner {
        uint256 value = address(this).balance;
        (bool sent, ) = owner().call{value: value}("");
        require(sent);

        emit Finalize(tokensSold, value);
    }

    function transferTokens(uint256 _amount) internal {
        uint256 tokenAmount = (_amount * 1e18) / price;
        _mint(msg.sender, tokenAmount);

        tokensSold += tokenAmount;

        emit Buy(tokenAmount, msg.sender);
    }

    modifier canBuy(uint256 _amount) {
        uint256 tokenAmount;


        console.log("tokenAmount", tokenAmount);
        console.log("msg.value", msg.value);
        console.log("_amount", _amount);
        
        // if (msg.data.length == 0) {
        //     // This is a receive() call
        //     tokenAmount = (msg.value * 1e18) / price;
        //     require(msg.value > 0, "Must send ETH");
        // } else {
            // This is a buyTokens() call
            tokenAmount = (_amount * 1e18) / price;
                    console.log("tokenAmount", tokenAmount);
            require(msg.value == (_amount * price) / 1e18, "Amount is not correct");
        //}

        _;
    }
}
