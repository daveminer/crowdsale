const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Crowdsale", function () {
  let crowdsale;
  beforeEach(async function () {
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    crowdsale = await Crowdsale.deploy();
  });

  describe("Deployment", function () {
    it("has correct name", async function () {
      expect(await crowdsale.name()).to.equal("Crowdsale");
    });
  });
});
