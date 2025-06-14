const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseEther(n.toString());
};

const ether = tokens;

describe("Crowdsale", () => {
  let crowdsale, result, token;
  let accounts, deployer, user1;

  beforeEach(async () => {
    // Load Contracts
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const Token = await ethers.getContractFactory("Token");

    // Deploy Token
    token = await Token.deploy("Shibsnax", "SNAX", "1000000");
    await token.deployed();

    // Deploy Crowdsale
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];

    const block = await ethers.provider.getBlock("latest");

    // Send tokens to crowdsale
    crowdsale = await Crowdsale.deploy(
      token.address,
      ether(1),
      "1000000",
      // Allowed addresses
      [user1.address],
      // Active on
      block.timestamp - 1000,
      // Fund by date
      block.timestamp + 1000,
      // Funding goal
      "10000000000000000000",
      // Min purchase
      1,
      // Max purchase
      100
    );
    await crowdsale.deployed();

    let transaction = await token
      .connect(deployer)
      .transfer(crowdsale.address, tokens(1000000));
    result = await transaction.wait();
  });

  describe("Deployment", () => {
    it("sends tokens to the Crowdsale contract", async () => {
      expect(await token.balanceOf(crowdsale.address)).to.equal(
        tokens(1000000)
      );
    });
    it("returns token address", async () => {
      expect(await crowdsale.token()).to.equal(token.address);
    });
  });

  describe("Buying Tokens", () => {
    let transaction, result;
    let amount = tokens(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, { value: ether(10) });
        result = await transaction.wait();
      });

      it("transfers tokens", async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(
          tokens(999990)
        );
        expect(await token.balanceOf(user1.address)).to.equal(amount);
      });

      it("updates contracts ether balance", async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          amount
        );
      });

      it("updates tokensSold", async () => {
        expect(await crowdsale.tokensSold()).to.equal(amount);
      });

      it("emits a buy event", async () => {
        await expect(transaction)
          .to.emit(crowdsale, "Buy")
          .withArgs(amount, await user1.getAddress());
      });
    });

    describe("Failure", () => {
      it("rejects insufficient ETH", async () => {
        await expect(crowdsale.connect(user1).buyTokens(amount, { value: 0 }))
          .to.be.reverted;
      });

      it("rejects non-allowed addresses", async () => {
        await expect(
          crowdsale.connect(user2).buyTokens(amount, { value: ether(10) })
        ).to.be.reverted;
      });

      it("doesn't allow buying before the activation time", async () => {
        const Crowdsale = await ethers.getContractFactory("Crowdsale");
        const block = await ethers.provider.getBlock("latest");

        let timelockedCrowdsale = await Crowdsale.deploy(
          token.address,
          ether(1),
          "1000000",
          // Allowed addresses
          [user1.address],
          // Active on
          block.timestamp + 1000,
          // Fund by date
          block.timestamp + 10000,
          // Funding goal
          100,
          // Min purchase
          1,
          // Max purchase
          100
        );

        await expect(
          timelockedCrowdsale
            .connect(user1)
            .buyTokens(amount, { value: ether(10) })
        ).to.be.revertedWith("Crowdsale is not active");
      });

      it("rejects minimum purchase", async () => {
        await expect(
          crowdsale.connect(user1).buyTokens(tokens(0.9), { value: ether(0.9) })
        ).to.be.revertedWith("Amount is less than the minimum purchase");
      });

      it("rejects maximum purchase", async () => {
        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), { value: ether(100.1) })
        ).to.be.revertedWith("Amount is greater than the maximum purchase");
      });
    });
  });

  describe("Sending ETH", () => {
    let transaction, result;
    let amount = ether(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await user1.sendTransaction({
          to: crowdsale.address,
          value: amount,
        });
        result = await transaction.wait();
      });

      it("updates contracts ether balance", async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          amount
        );
      });

      it("updates user token balance", async () => {
        expect(await token.balanceOf(user1.address)).to.equal(amount);
      });
    });

    describe("Failure", () => {
      it("rejects non-allowed addresses", async () => {
        await expect(
          user2.sendTransaction({ to: crowdsale.address, value: amount })
        ).to.be.reverted;
      });

      it("rejects transfers before the activation time", async () => {
        const Crowdsale = await ethers.getContractFactory("Crowdsale");
        const block = await ethers.provider.getBlock("latest");

        let timelockedCrowdsale = await Crowdsale.deploy(
          token.address,
          ether(1),
          "1000000",
          // Allowed addresses
          [user1.address],
          // Active on
          block.timestamp + 1000,
          // Fund by date
          block.timestamp + 10000,
          // Funding goal
          100,
          // Min purchase
          1,
          // Max purchase
          10
        );

        await expect(
          user1.sendTransaction({
            to: timelockedCrowdsale.address,
            value: amount,
          })
        ).to.be.revertedWith("Crowdsale is not active");
      });

      it("rejects insufficient tokens", async () => {
        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), { value: ether(100.1) })
        ).to.be.revertedWith("Amount is greater than the maximum purchase");
      });

      it("reject purchases below the minimum purchase", async () => {
        await expect(
          crowdsale.connect(user1).buyTokens(tokens(0.9), { value: ether(0.9) })
        ).to.be.revertedWith("Amount is less than the minimum purchase");
      });

      it("rejects purchases above the maximum purchase", async () => {
        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), { value: ether(100.1) })
        ).to.be.revertedWith("Amount is greater than the maximum purchase");
      });
    });
  });

  describe("Updating Price", () => {
    let transaction, result;
    let price = ether(2);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale.connect(deployer).setPrice(price);
        result = await transaction.wait();
      });

      it("updates the price", async () => {
        expect(await crowdsale.price()).to.equal(price);
      });
    });

    describe("Failure", () => {
      it("prevents non-owner from updating price", async () => {
        await expect(crowdsale.connect(user1).setPrice(price)).to.be.reverted;
      });
    });
  });

  describe("Finalizing Sale", () => {
    let transaction;

    let amount = tokens(10);
    let value = ether(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, { value: value });
        await transaction.wait();

        transaction = await crowdsale.connect(deployer).finalize();
        await transaction.wait();
      });

      it("transfers remaining tokens to owner", async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(0));
        expect(await token.balanceOf(deployer.address)).to.equal(
          tokens(999990)
        );
      });

      it("transfers ETH balance to owner", async () => {
        expect(
          await ethers.provider.getBalance(await crowdsale.address)
        ).to.equal(0);
      });

      it("emits Finalize event", async () => {
        await expect(transaction)
          .to.emit(crowdsale, "Finalize")
          .withArgs(amount, value);
      });
    });

    describe("Failure", () => {
      it("prevents non-owner from finalizing", async () => {
        await expect(crowdsale.connect(user1).finalize()).to.be.reverted;
      });
    });
  });

  describe("Allowed Addresses", () => {
    describe("Success", () => {
      it("allows the owner to add and remove addresses", async () => {
        await crowdsale.connect(deployer).addAllowedAddress(user2.address);
        expect(await crowdsale.isAllowed(user2.address)).to.equal(true);
        await crowdsale.connect(deployer).removeAllowedAddress(user2.address);
        expect(await crowdsale.isAllowed(user2.address)).to.equal(false);
      });
    });

    describe("Failure", () => {
      it("prevents non-owner from adding addresses", async () => {
        await expect(crowdsale.connect(user1).addAllowedAddress(user2.address))
          .to.be.reverted;
      });

      it("won't allow deletions for addresses that don't exist", async () => {
        await expect(
          crowdsale.connect(user1).removeAllowedAddress(user1.address)
        ).to.be.reverted;
      });

      it("won't allow adding the same address twice", async () => {
        await crowdsale.connect(deployer).addAllowedAddress(user2.address);
        await expect(
          crowdsale.connect(deployer).addAllowedAddress(user2.address)
        ).to.be.reverted;
      });
    });
  });

  describe("Claiming Refund", () => {
    describe("Success", () => {
      it("allows users to claim refunds if the sale is cancelled", async () => {
        // Check user's ether balance
        let userEtherBalance = await ethers.provider.getBalance(user1.address);

        // Send ether to the contract
        let userSendEtherTransaction = await user1.sendTransaction({
          to: crowdsale.address,
          value: ether(1),
        });
        await userSendEtherTransaction.wait();

        await ethers.provider.send("evm_increaseTime", [10000]); // Advance by 10000 seconds
        await ethers.provider.send("evm_mine");

        // Approve token transfer for refund
        const tokenAmount = await token.balanceOf(user1.address);
        await token.connect(user1).approve(crowdsale.address, tokenAmount);

        let result = await crowdsale.connect(user1).claimRefund();
        await result.wait();

        expect(await token.balanceOf(user1.address)).to.equal(tokens(0));
        // Subtract .0001 eth to account for gas
        expect(userEtherBalance - userEtherBalanceAfter).to.be.lessThan(
          1000000000000000
        );
      });
    });

    describe("Failure", () => {
      it("prevents users from claiming refunds if the sale is not cancelled", async () => {
        await expect(crowdsale.connect(user1).claimRefund()).to.be.reverted;
      });
    });
  });
});
