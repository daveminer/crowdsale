// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')
const { ethers } = require('hardhat')

// Simple function to build a proper Merkle tree
function buildMerkleTree(leaves) {
  if (leaves.length === 0) return null
  if (leaves.length === 1) return leaves[0]

  const layer = []
  for (let i = 0; i < leaves.length; i += 2) {
    if (i + 1 < leaves.length) {
      layer.push(
        ethers.utils.keccak256(ethers.utils.concat([leaves[i], leaves[i + 1]]))
      )
    } else {
      layer.push(leaves[i])
    }
  }

  return buildMerkleTree(layer)
}

async function main() {
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const NAME = 'Shibsnax'
  const SYMBOL = 'SNAX'
  const MAX_SUPPLY = '1000000'
  const PRICE = ethers.utils.parseUnits('0.025', 'ether')

  // Initial allowed address (same as in localStorage utility)
  const INITIAL_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  const allowedAddresses = [INITIAL_ADDRESS]

  const Token = await hre.ethers.getContractFactory('Token')
  let token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY)
  await token.deployed()

  console.log(`Token deployed to: ${token.address}\n`)

  const block = await ethers.provider.getBlock('latest')

  console.log(`Using initial allowed address: ${INITIAL_ADDRESS}`)

  // Create Merkle root from allowed addresses
  const leaves = allowedAddresses.map((address) =>
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [address])
    )
  )

  // For simplicity, we'll use the first leaf as the root
  // In production, you would use a proper Merkle tree library
  const merkleRoot = buildMerkleTree(leaves)

  const Crowdsale = await hre.ethers.getContractFactory('Crowdsale')
  let crowdsale = await Crowdsale.deploy(
    token.address,
    PRICE,
    ethers.utils.parseUnits(MAX_SUPPLY, 'ether'),
    // Merkle root
    merkleRoot,
    // Active on
    block.timestamp + 60,
    // Fund by date
    block.timestamp + 10000,
    // Funding goal
    100,
    // Min purchase
    1,
    // Max purchase
    100
  )
  await crowdsale.deployed()

  console.log(`Crowdsale deployed to: ${crowdsale.address}\n`)
  console.log(`Merkle root: ${merkleRoot}\n`)

  const transaction = await token.transfer(
    crowdsale.address,
    ethers.utils.parseUnits(MAX_SUPPLY, 'ether')
  )
  await transaction.wait()

  console.log(`Tokens transferred to Crowdsale\n`)

  // Log deployment information
  console.log(`=== DEPLOYMENT SUMMARY ===`)
  console.log(`Initial allowed address: ${INITIAL_ADDRESS}`)
  console.log(`Merkle root: ${merkleRoot}`)
  console.log(`Crowdsale address: ${crowdsale.address}`)
  console.log(`Token address: ${token.address}`)
  console.log(`Deployer address: ${deployer.address}`)
  console.log(`Deployed at: ${new Date().toISOString()}`)
  console.log(`=== END DEPLOYMENT SUMMARY ===`)

  console.log(
    `\nNote: The React app will automatically initialize localStorage with the initial address when it starts.`
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
