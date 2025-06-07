// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const NAME = "Shibsnax";
  const SYMBOL = "SNAX";
  const MAX_SUPPLY = "1000000";
  const PRICE = hre.ethers.parseEther("0.025");

  const Token = await hre.ethers.getContractFactory("Token");
  let token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY);
  await token.waitForDeployment();

  console.log(`Token deployed to: ${await token.getAddress()}\n`);

  const Crowdsale = await hre.ethers.getContractFactory("Crowdsale");
  let crowdsale = await Crowdsale.deploy(
    await token.getAddress(),
    PRICE,
    MAX_SUPPLY
  );
  await crowdsale.waitForDeployment();

  console.log(`Crowdsale deployed to: ${await crowdsale.getAddress()}\n`);

  const transaction = await token.transfer(
    await crowdsale.getAddress(),
    hre.ethers.parseEther(MAX_SUPPLY)
  );
  await transaction.wait();

  console.log(`Tokens transferred to Crowdsale\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
