// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat')
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

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

  const Token = await hre.ethers.getContractFactory('Token')
  let token = await Token.deploy(NAME, SYMBOL, MAX_SUPPLY)
  await token.deployed()

  console.log(`Token deployed to: ${token.address}\n`)

  const block = await ethers.provider.getBlock('latest')

  // Read allowed addresses from allowedAddresses.json
  const allowedAddressesPath = path.join(
    __dirname,
    '..',
    'src',
    'allowedAddresses.json'
  )

  if (!fs.existsSync(allowedAddressesPath)) {
    throw new Error(
      `allowedAddresses.json file not found at ${allowedAddressesPath}`
    )
  }

  const allowedAddressesData = JSON.parse(
    fs.readFileSync(allowedAddressesPath, 'utf8')
  )
  const allowedAddresses = allowedAddressesData.addresses

  if (!Array.isArray(allowedAddresses) || allowedAddresses.length === 0) {
    throw new Error('No valid addresses found in allowedAddresses.json')
  }

  console.log(
    `Loaded ${allowedAddresses.length} allowed addresses from allowedAddresses.json`
  )

  // Create Merkle root from allowed addresses
  const leaves = allowedAddresses.map((address) =>
    ethers.utils.keccak256(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['address'], [address])
      )
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

  // Update allowedAddresses.json with deployment information
  const deploymentInfo = {
    addresses: allowedAddresses,
    merkleRoot: merkleRoot,
    crowdsaleAddress: crowdsale.address,
    tokenAddress: token.address,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
  }

  fs.writeFileSync(
    allowedAddressesPath,
    JSON.stringify(deploymentInfo, null, 2)
  )

  console.log(`Updated allowedAddresses.json with deployment information`)
  console.log(`Allowed addresses: ${JSON.stringify(allowedAddresses, null, 2)}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
