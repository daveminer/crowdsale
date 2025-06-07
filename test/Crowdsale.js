const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.parseEther(n.toString());
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
    await token.waitForDeployment();

    // Deploy Crowdsale
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    user1 = accounts[1];

    // Send tokens to crowdsale
    crowdsale = await Crowdsale.deploy(
      await token.getAddress(),
      ether(1),
      "1000000"
    );
    await crowdsale.waitForDeployment();

    let transaction = await token
      .connect(deployer)
      .transfer(await crowdsale.getAddress(), tokens(1000000));
    result = await transaction.wait();
  });

  describe("Deployment", () => {
    it("sends tokens to the Crowdsale contract", async () => {
      expect(await token.balanceOf(await crowdsale.getAddress())).to.equal(
        tokens(1000000)
      );
    });
    it("returns token address", async () => {
      expect(await crowdsale.token()).to.equal(await token.getAddress());
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
        expect(await token.balanceOf(await crowdsale.getAddress())).to.equal(
          tokens(999990)
        );
        expect(await token.balanceOf(await user1.getAddress())).to.equal(
          amount
        );
      });

      it("updates contracts ether balance", async () => {
        expect(
          await ethers.provider.getBalance(await crowdsale.getAddress())
        ).to.equal(amount);
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
    let amount = ether(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await user1.sendTransaction({
          to: await crowdsale.getAddress(),
          value: amount,
        });
        result = await transaction.wait();
      });

      it("updates contracts ether balance", async () => {
        expect(
          await ethers.provider.getBalance(await crowdsale.getAddress())
        ).to.equal(amount);
      });

      it("updates user token balance", async () => {
        expect(await token.balanceOf(await user1.getAddress())).to.equal(
          amount
        );
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
  });

  describe("Finalizing Sale", () => {
    let transaction, result;

    let amount = tokens(10);
    let value = ether(10);

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, { value: value });
        result = await transaction.wait();

        transaction = await crowdsale.connect(deployer).finalize();
        result = await transaction.wait();
      });

      it("transfers remaining tokens to owner", async () => {
        expect(await token.balanceOf(await crowdsale.getAddress())).to.equal(
          tokens(0)
        );
        expect(await token.balanceOf(await deployer.getAddress())).to.equal(
          tokens(999990)
        );
      });

      it("transfers ETH balance to owner", async () => {
        expect(
          await ethers.provider.getBalance(await crowdsale.getAddress())
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
