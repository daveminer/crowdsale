const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseEther(n.toString());
};

const ether = tokens;

describe("Open Zeppelin Crowdsale", () => {
  let accounts, crowdsale, deployer, result, user1, user2;

  beforeEach(async () => {
    // Deploy Crowdsale
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];

    // Load Contracts
    const OZepCrowdsale = await ethers.getContractFactory("OZepCrowdsale");
    crowdsale = await OZepCrowdsale.deploy(
      deployer.address,
      deployer.address,
      ether(0.5)
    );
    await crowdsale.deployed();
  });

  describe("Buying Tokens", () => {
    let transaction, result;
    let amount = tokens(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, { value: ether(5) });
        result = await transaction.wait();
      });

      it("transfers tokens", async () => {
        expect(await crowdsale.balanceOf(user1.address)).to.equal(amount);
      });

      it("updates contracts ether balance", async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          ether(5)
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
    });
  });

  describe("Sending ETH", () => {
    let transaction, result;
    let amount = tokens(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await user1.sendTransaction({
          to: crowdsale.address,
          value: ether(5),
        });
        result = await transaction.wait();
      });

      it("updates contracts ether balance", async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          ether(5)
        );
      });

      it("updates user token balance", async () => {
        expect(await crowdsale.balanceOf(user1.address)).to.equal(amount);
      });
    });

    describe("Failure", () => {
      it("rejects transaction with insufficient ETH", async () => {
        // Get user's current balance
        const balance = await ethers.provider.getBalance(user1.address);

        // Calculate token amount that would require more ETH than user has
        const tokenAmount = tokens(10000000);
        const requiredEth = tokenAmount
          .mul(ethers.utils.parseEther("0.5"))
          .div(ethers.utils.parseEther("1"));

        // Try to buy tokens with more ETH than user has
        await expect(
          crowdsale.connect(user1).buyTokens(tokenAmount, {
            value: balance, // Send entire balance, which will fail due to gas costs
          })
        ).to.be.rejectedWith("Sender doesn't have enough funds to send tx");
      });
    });
  });

  describe("Finalizing Sale", () => {
    let transaction;

    let amount = tokens(10);
    let value = ether(5);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, { value: value });
        await transaction.wait();

        transaction = await crowdsale.connect(deployer).finalize();
        await transaction.wait();
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
});
