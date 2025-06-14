const hre = require("hardhat");

async function main() {
  // Advance time by 60 seconds
  await hre.network.provider.send("evm_increaseTime", [60]);
  await hre.network.provider.send("evm_mine");

  const block = await hre.ethers.provider.getBlock("latest");
  console.log(
    "New block timestamp:",
    new Date(block.timestamp * 1000).toLocaleString()
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
