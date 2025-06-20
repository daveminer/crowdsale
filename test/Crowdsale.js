const { expect } = require('chai')
const { ethers } = require('hardhat')

const tokens = (n) => {
  return ethers.utils.parseEther(n.toString())
}

const ether = tokens

describe('Crowdsale', () => {
  let crowdsale, result, token
  let accounts, deployer, user1, user2
  let tokenPrice = 0.25

  beforeEach(async () => {
    // Load Contracts
    const Crowdsale = await ethers.getContractFactory('Crowdsale')
    const Token = await ethers.getContractFactory('Token')

    // Deploy Token
    token = await Token.deploy('Shibsnax', 'SNAX', '1000000')
    await token.deployed()

    // Deploy Crowdsale
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]

    const block = await ethers.provider.getBlock('latest')

    // Create a simple Merkle root for user1
    const leaf = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['address'], [user1.address])
    )
    const merkleRoot = leaf // For a single address, the root is the leaf itself

    // Send tokens to crowdsale
    crowdsale = await Crowdsale.deploy(
      token.address,
      ether(tokenPrice),
      '1000000',
      // Merkle root
      merkleRoot,
      // Active on
      block.timestamp - 1000,
      // Fund by date
      block.timestamp + 1000,
      // Funding goal
      '10000000000000000000',
      // Min purchase
      1,
      // Max purchase
      100
    )
    await crowdsale.deployed()

    let transaction = await token
      .connect(deployer)
      .transfer(crowdsale.address, tokens(1000000))
    result = await transaction.wait()
  })

  describe('Deployment', () => {
    it('sends tokens to the Crowdsale contract', async () => {
      expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(1000000))
    })
    it('returns token address', async () => {
      expect(await crowdsale.token()).to.equal(token.address)
    })
  })

  describe('Buying Tokens', () => {
    let transaction, result
    let ethAmount = ether(10)
    let tokenAmount = tokens(40)

    describe('Success', () => {
      beforeEach(async () => {
        // First approve the address with Merkle proof
        const proof = [] // Empty proof for single address
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        transaction = await crowdsale
          .connect(user1)
          .buyTokens(tokenAmount, proof, { value: ethAmount })
        result = await transaction.wait()
      })

      it('transfers tokens', async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(
          tokens(999960)
        )
        expect(await token.balanceOf(user1.address)).to.equal(tokenAmount)
      })

      it('updates contracts ether balance', async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          ethAmount
        )
      })

      it('updates tokensSold', async () => {
        expect(await crowdsale.tokensSold()).to.equal(tokenAmount)
      })

      it('emits a buy event', async () => {
        await expect(transaction)
          .to.emit(crowdsale, 'Buy')
          .withArgs(tokenAmount, await user1.getAddress())
      })
    })

    describe('Failure', () => {
      it('rejects insufficient ETH', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale.connect(user1).buyTokens(tokenAmount, proof, { value: 0 })
        ).to.be.reverted
      })

      it('rejects non-allowed addresses', async () => {
        const emptyProof = []
        await expect(
          crowdsale
            .connect(user2)
            .buyTokens(tokenAmount, emptyProof, { value: ethAmount })
        ).to.be.revertedWith('Caller is not in the list of allowed addresses')
      })

      it("doesn't allow buying before the activation time", async () => {
        const Crowdsale = await ethers.getContractFactory('Crowdsale')
        const block = await ethers.provider.getBlock('latest')

        const leaf = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [user1.address])
        )
        const merkleRoot = leaf

        let timelockedCrowdsale = await Crowdsale.deploy(
          token.address,
          ether(tokenPrice),
          '1000000',
          // Merkle root
          merkleRoot,
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
        )

        const proof = []
        await timelockedCrowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          timelockedCrowdsale
            .connect(user1)
            .buyTokens(tokenAmount, proof, { value: ethAmount })
        ).to.be.revertedWith('Crowdsale is not active')
      })

      it('rejects minimum purchase', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(0.9), proof, { value: ether(0.225) })
        ).to.be.revertedWith('Amount is less than the minimum purchase')
      })

      it('rejects maximum purchase', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), proof, { value: ether(25.025) })
        ).to.be.revertedWith('Amount is greater than the maximum purchase')
      })
    })
  })

  describe('Sending ETH', () => {
    let transaction, result
    let amount = ether(0.25)

    describe('Success', () => {
      beforeEach(async () => {
        // First approve the address with Merkle proof
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        transaction = await user1.sendTransaction({
          to: crowdsale.address,
          value: amount,
        })
        result = await transaction.wait()
      })

      it('updates contracts ether balance', async () => {
        expect(await ethers.provider.getBalance(crowdsale.address)).to.equal(
          amount
        )
      })

      it('updates user token balance', async () => {
        expect(await token.balanceOf(user1.address)).to.equal(tokens(1))
      })
    })

    describe('Failure', () => {
      it('rejects non-allowed addresses', async () => {
        await expect(
          user2.sendTransaction({ to: crowdsale.address, value: amount })
        ).to.be.revertedWith('Caller is not in the list of allowed addresses')
      })

      it('rejects transfers before the activation time', async () => {
        const Crowdsale = await ethers.getContractFactory('Crowdsale')
        const block = await ethers.provider.getBlock('latest')

        const leaf = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [user1.address])
        )
        const merkleRoot = leaf

        let timelockedCrowdsale = await Crowdsale.deploy(
          token.address,
          ether(1),
          '1000000',
          // Merkle root
          merkleRoot,
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
        )

        const proof = []
        await timelockedCrowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          user1.sendTransaction({
            to: timelockedCrowdsale.address,
            value: amount,
          })
        ).to.be.revertedWith('Crowdsale is not active')
      })

      it('rejects insufficient tokens', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), proof, { value: ether(25.025) })
        ).to.be.revertedWith('Amount is greater than the maximum purchase')
      })

      it('reject purchases below the minimum purchase', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(0.9), proof, { value: ether(0.225) })
        ).to.be.revertedWith('Amount is less than the minimum purchase')
      })

      it('rejects purchases above the maximum purchase', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        await expect(
          crowdsale
            .connect(user1)
            .buyTokens(tokens(100.1), proof, { value: ether(25.025) })
        ).to.be.revertedWith('Amount is greater than the maximum purchase')
      })
    })
  })

  describe('Updating Price', () => {
    let transaction, result
    let price = ether(2)

    describe('Success', () => {
      beforeEach(async () => {
        transaction = await crowdsale.connect(deployer).setPrice(price)
        result = await transaction.wait()
      })

      it('updates the price', async () => {
        expect(await crowdsale.price()).to.equal(price)
      })
    })

    describe('Failure', () => {
      it('prevents non-owner from updating price', async () => {
        await expect(crowdsale.connect(user1).setPrice(price)).to.be.reverted
      })
    })
  })

  describe('Merkle Root Management', () => {
    describe('Success', () => {
      it('allows the owner to update the Merkle root', async () => {
        const newLeaf = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [user2.address])
        )
        const newMerkleRoot = newLeaf
        await crowdsale.connect(deployer).setMerkleRoot(newMerkleRoot)
        expect(await crowdsale.merkleRoot()).to.equal(newMerkleRoot)
      })
    })

    describe('Failure', () => {
      it('prevents non-owner from updating Merkle root', async () => {
        const newLeaf = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address'], [user2.address])
        )
        const newMerkleRoot = newLeaf
        await expect(crowdsale.connect(user1).setMerkleRoot(newMerkleRoot)).to
          .be.reverted
      })
    })
  })

  describe('Address Approval', () => {
    describe('Success', () => {
      it('allows users to approve their address with valid Merkle proof', async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)
        expect(await crowdsale.isAllowed(user1.address)).to.equal(true)
      })

      it('emits AddressApproved event', async () => {
        const proof = []
        await expect(
          crowdsale.connect(user1).approveAddressWithProof(user1.address, proof)
        )
          .to.emit(crowdsale, 'AddressApproved')
          .withArgs(user1.address)
      })
    })

    describe('Failure', () => {
      it('rejects invalid Merkle proof', async () => {
        const invalidProof = []
        await expect(
          crowdsale
            .connect(user2)
            .approveAddressWithProof(user2.address, invalidProof)
        ).to.be.revertedWith('Invalid Merkle proof')
      })
    })
  })

  describe('Finalizing Sale', () => {
    let transaction

    let amount = tokens(10)
    let ethAmount = ether(2.5)

    describe('Success', () => {
      beforeEach(async () => {
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        transaction = await crowdsale
          .connect(user1)
          .buyTokens(amount, proof, { value: ethAmount })
        await transaction.wait()

        transaction = await crowdsale.connect(deployer).finalize()
        await transaction.wait()
      })

      it('transfers remaining tokens to owner', async () => {
        expect(await token.balanceOf(crowdsale.address)).to.equal(tokens(0))
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999990))
      })

      it('transfers ETH balance to owner', async () => {
        expect(
          await ethers.provider.getBalance(await crowdsale.address)
        ).to.equal(0)
      })

      it('emits Finalize event', async () => {
        await expect(transaction)
          .to.emit(crowdsale, 'Finalize')
          .withArgs(amount, ethAmount)
      })
    })

    describe('Failure', () => {
      it('prevents non-owner from finalizing', async () => {
        await expect(crowdsale.connect(user1).finalize()).to.be.reverted
      })
    })
  })

  describe('Claiming Refund', () => {
    describe('Success', () => {
      it('allows users to claim refunds if the sale is cancelled', async () => {
        // Check user's ether balance
        let userEtherBalance = await ethers.provider.getBalance(user1.address)

        // Approve address first
        const proof = []
        await crowdsale
          .connect(user1)
          .approveAddressWithProof(user1.address, proof)

        // Send ether to the contract
        let userSendEtherTransaction = await user1.sendTransaction({
          to: crowdsale.address,
          value: ether(1),
        })
        await userSendEtherTransaction.wait()

        await ethers.provider.send('evm_increaseTime', [10000]) // Advance by 10000 seconds
        await ethers.provider.send('evm_mine')

        // Approve token transfer for refund
        const tokenAmount = await token.balanceOf(user1.address)
        await token.connect(user1).approve(crowdsale.address, tokenAmount)

        let result = await crowdsale.connect(user1).claimRefund()
        await result.wait()

        let userEtherBalanceAfter = await ethers.provider.getBalance(
          user1.address
        )

        expect(await token.balanceOf(user1.address)).to.equal(tokens(0))
        // Subtract .0001 eth to account for gas
        expect(userEtherBalance - userEtherBalanceAfter).to.be.lessThan(
          1000000000000000
        )
      })
    })

    describe('Failure', () => {
      it('prevents users from claiming refunds if the sale is not cancelled', async () => {
        await expect(crowdsale.connect(user1).claimRefund()).to.be.reverted
      })
    })
  })
})
