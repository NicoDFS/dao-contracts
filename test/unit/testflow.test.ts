import { Contract } from "ethers"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import {
  FUNC,
  PROPOSAL_DESCRIPTION,
  NEW_STORE_VALUE,
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
} from "../../helper-hardhat-config"
import { moveBlocks } from "../../utils/move-blocks"
import { moveTime } from "../../utils/move-time"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("Governor Flow", async () => {
  let governor: Contract
  let governanceToken: Contract
  let timeLock: Contract
  let treasuryVault: Contract
  let mockERC20: Contract
  let deployer: SignerWithAddress
  let voter: SignerWithAddress
  const voteWay = 1 // for
  const reason = "I lika do da cha cha"
  
  beforeEach(async () => {
    await deployments.fixture(["all"])
    governor = await ethers.getContract("GovernorContract")
    timeLock = await ethers.getContract("TimeLock")
    governanceToken = await ethers.getContract("GovernanceToken")
    treasuryVault = await ethers.getContract("TreasuryVault")
    
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    voter = accounts[1]
    
    // Fund the voter with ETH and governance tokens
    await deployer.sendTransaction({
      to: voter.address,
      value: ethers.utils.parseEther("10")
    })
    
    // Deposit native tokens to get governance tokens
    await governanceToken.connect(voter).deposit({ 
      value: ethers.utils.parseEther("5") 
    })
    
    // Delegate voting power to self
    await governanceToken.connect(voter).delegate(voter.address)

    // Deploy a mock ERC20 token for testing treasury functions
    const MockERC20 = await ethers.getContractFactory("MockERC20")
    mockERC20 = await MockERC20.deploy("Mock Token", "MOCK", ethers.utils.parseEther("1000"))
    await mockERC20.deployed()
    
    // Transfer some tokens to the treasury for testing
    await mockERC20.transfer(treasuryVault.address, ethers.utils.parseEther("100"))
  })

  describe("GovernanceToken", () => {
    it("allows depositing native tokens for governance tokens", async () => {
      const depositAmount = ethers.utils.parseEther("1")
      
      // Check balance before deposit
      const balanceBefore = await governanceToken.balanceOf(deployer.address)
      
      await governanceToken.connect(deployer).deposit({
        value: depositAmount
      })
      
      // Check balance after deposit
      const balanceAfter = await governanceToken.balanceOf(deployer.address)
      
      // Check that balance increased by exactly the deposit amount
      assert.equal(
        balanceAfter.sub(balanceBefore).toString(), 
        depositAmount.toString()
      )
    })
    
    it("allows depositing tokens via receive function (direct ETH transfer)", async () => {
      const depositAmount = ethers.utils.parseEther("1")
      
      // Check balance before deposit
      const balanceBefore = await governanceToken.balanceOf(deployer.address)
      
      // Send ETH directly to the contract (triggers receive)
      await deployer.sendTransaction({
        to: governanceToken.address,
        value: depositAmount
      })
      
      // Check balance after deposit
      const balanceAfter = await governanceToken.balanceOf(deployer.address)
      
      // Check that balance increased by exactly the deposit amount
      assert.equal(
        balanceAfter.sub(balanceBefore).toString(), 
        depositAmount.toString()
      )
    })
    
    it("allows withdrawing native tokens", async () => {
      const depositAmount = ethers.utils.parseEther("1")
      
      // Deposit first
      await governanceToken.connect(deployer).deposit({
        value: depositAmount
      })
      
      // Get token balance before withdrawal
      const tokenBalanceBefore = await governanceToken.balanceOf(deployer.address)
      
      // Check ETH balance before withdrawal
      const balanceBefore = await ethers.provider.getBalance(deployer.address)
      
      // Withdraw
      const tx = await governanceToken.connect(deployer).withdraw(depositAmount)
      const receipt = await tx.wait(1)
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
      
      // Check balance after withdrawal
      const balanceAfter = await ethers.provider.getBalance(deployer.address)
      const tokenBalanceAfter = await governanceToken.balanceOf(deployer.address)
      
      // Check that token balance decreased by exactly the withdrawal amount
      assert.equal(
        tokenBalanceBefore.sub(tokenBalanceAfter).toString(),
        depositAmount.toString()
      )
      
      // Account for gas used in the transaction
      const expectedBalance = balanceBefore.sub(gasUsed).add(depositAmount)
      
      // Allow for a small margin of error due to gas calculations
      const diff = expectedBalance.sub(balanceAfter).abs()
      expect(diff.lt(ethers.utils.parseEther("0.0001"))).to.be.true
    })
    
    it("gives voting power after deposit and delegation", async () => {
      // Check voter's voting power
      const votes = await governanceToken.getVotes(voter.address)
      expect(votes).to.equal(ethers.utils.parseEther("5"))
    })
  })
  
  describe("TreasuryVault", () => {
    it("can only be changed through governance", async () => {
      await expect(treasuryVault.store(55)).to.be.revertedWith("Ownable: caller is not the owner")
    })
    
    it("can receive native tokens", async () => {
      const amount = ethers.utils.parseEther("1")
      
      // Send native tokens to treasury
      await deployer.sendTransaction({
        to: treasuryVault.address,
        value: amount
      })
      
      // Check treasury balance
      const balance = await treasuryVault.getNativeTokenBalance()
      assert.equal(balance.toString(), amount.toString())
    })
    
    it("allows checking ERC20 token balance", async () => {
      if (!mockERC20) {
        // Skip test if mock token not deployed
        console.log("Skipping ERC20 test as mock token not deployed")
        return
      }
      
      const expectedBalance = ethers.utils.parseEther("100")
      const balance = await treasuryVault.getERC20TokenBalance(mockERC20.address)
      expect(balance).to.equal(expectedBalance)
    })
  })

  describe("Governance Process", () => {
    it("proposes, votes, waits, queues, and then executes store function", async () => {
      // propose
      const encodedFunctionCall = treasuryVault.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
      const proposeTx = await governor.propose(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        PROPOSAL_DESCRIPTION
      )

      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events![0].args!.proposalId
      let proposalState = await governor.state(proposalId)
      console.log(`Current Proposal State: ${proposalState}`)

      await moveBlocks(VOTING_DELAY + 1)
      // vote
      const voteTx = await governor.connect(voter).castVoteWithReason(proposalId, voteWay, reason)
      await voteTx.wait(1)
      proposalState = await governor.state(proposalId)
      assert.equal(proposalState.toString(), "1")
      console.log(`Current Proposal State: ${proposalState}`)
      await moveBlocks(VOTING_PERIOD + 1)

      // queue & execute
      // const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
      const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION)
      const queueTx = await governor.queue([treasuryVault.address], [0], [encodedFunctionCall], descriptionHash)
      await queueTx.wait(1)
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)

      proposalState = await governor.state(proposalId)
      console.log(`Current Proposal State: ${proposalState}`)

      console.log("Executing...")
      const exTx = await governor.execute([treasuryVault.address], [0], [encodedFunctionCall], descriptionHash)
      await exTx.wait(1)
      console.log((await treasuryVault.retrieve()).toString())
    })
    
    it("can propose and execute treasury native token transfer", async () => {
      // First, let's fund the treasury
      const treasuryAmount = ethers.utils.parseEther("2")
      await deployer.sendTransaction({
        to: treasuryVault.address,
        value: treasuryAmount
      })
      
      // Propose to send 1 ETH to the voter
      const transferAmount = ethers.utils.parseEther("1")
      const encodedFunctionCall = treasuryVault.interface.encodeFunctionData(
        "sendNativeToken", 
        [voter.address, transferAmount]
      )
      
      const proposeTx = await governor.propose(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        "Proposal to transfer native tokens"
      )

      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events![0].args!.proposalId
      
      // Move to voting period
      await moveBlocks(VOTING_DELAY + 1)
      
      // Vote
      await governor.connect(voter).castVoteWithReason(proposalId, voteWay, "I support this transfer")
      
      // Move past voting period
      await moveBlocks(VOTING_PERIOD + 1)
      
      // Queue
      const descriptionHash = ethers.utils.id("Proposal to transfer native tokens")
      await governor.queue(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Wait minimum delay
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Check voter balance before execution
      const voterBalanceBefore = await ethers.provider.getBalance(voter.address)
      
      // Execute
      await governor.execute(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Check voter balance after execution
      const voterBalanceAfter = await ethers.provider.getBalance(voter.address)
      
      // Voter should have received 1 ETH
      expect(voterBalanceAfter.sub(voterBalanceBefore)).to.equal(transferAmount)
      
      // Treasury should be down 1 ETH
      const treasuryBalance = await treasuryVault.getNativeTokenBalance()
      expect(treasuryBalance).to.equal(treasuryAmount.sub(transferAmount))
    })
    
    it("can propose and execute treasury ERC20 token transfer", async () => {
      if (!mockERC20) {
        console.log("Skipping ERC20 test as mock token not deployed")
        return
      }
      
      // Check initial balances
      const initialTreasuryBalance = await mockERC20.balanceOf(treasuryVault.address)
      const initialRecipientBalance = await mockERC20.balanceOf(voter.address)
      
      // Propose to send ERC20 tokens to the voter
      const transferAmount = ethers.utils.parseEther("50")
      const encodedFunctionCall = treasuryVault.interface.encodeFunctionData(
        "sendERC20Token", 
        [mockERC20.address, voter.address, transferAmount]
      )
      
      const proposeTx = await governor.propose(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        "Proposal to transfer ERC20 tokens"
      )

      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events![0].args!.proposalId
      
      // Move to voting period
      await moveBlocks(VOTING_DELAY + 1)
      
      // Vote
      await governor.connect(voter).castVoteWithReason(proposalId, voteWay, "I support this transfer")
      
      // Move past voting period
      await moveBlocks(VOTING_PERIOD + 1)
      
      // Queue
      const descriptionHash = ethers.utils.id("Proposal to transfer ERC20 tokens")
      await governor.queue(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Wait minimum delay
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute
      await governor.execute(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Check final balances
      const finalTreasuryBalance = await mockERC20.balanceOf(treasuryVault.address)
      const finalRecipientBalance = await mockERC20.balanceOf(voter.address)
      
      expect(initialTreasuryBalance.sub(finalTreasuryBalance)).to.equal(transferAmount)
      expect(finalRecipientBalance.sub(initialRecipientBalance)).to.equal(transferAmount)
    })
    
    it("can propose and execute batch ERC20 token transfer", async () => {
      if (!mockERC20) {
        console.log("Skipping ERC20 test as mock token not deployed")
        return
      }
      
      // Create additional test accounts
      const accounts = await ethers.getSigners()
      const recipient1 = accounts[2]
      const recipient2 = accounts[3]
      
      const amount1 = ethers.utils.parseEther("10")
      const amount2 = ethers.utils.parseEther("20")
      
      // Check initial balances
      const initialTreasuryBalance = await mockERC20.balanceOf(treasuryVault.address)
      const initialBalance1 = await mockERC20.balanceOf(recipient1.address)
      const initialBalance2 = await mockERC20.balanceOf(recipient2.address)
      
      // Propose to batch send ERC20 tokens
      const encodedFunctionCall = treasuryVault.interface.encodeFunctionData(
        "batchSendERC20Token", 
        [
          mockERC20.address, 
          [recipient1.address, recipient2.address],
          [amount1, amount2]
        ]
      )
      
      const proposeTx = await governor.propose(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        "Proposal to batch transfer ERC20 tokens"
      )

      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events![0].args!.proposalId
      
      // Move to voting period
      await moveBlocks(VOTING_DELAY + 1)
      
      // Vote
      await governor.connect(voter).castVoteWithReason(proposalId, voteWay, "I support this batch transfer")
      
      // Move past voting period
      await moveBlocks(VOTING_PERIOD + 1)
      
      // Queue
      const descriptionHash = ethers.utils.id("Proposal to batch transfer ERC20 tokens")
      await governor.queue(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Wait minimum delay
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute
      await governor.execute(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Check final balances
      const finalTreasuryBalance = await mockERC20.balanceOf(treasuryVault.address)
      const finalBalance1 = await mockERC20.balanceOf(recipient1.address)
      const finalBalance2 = await mockERC20.balanceOf(recipient2.address)
      
      expect(initialTreasuryBalance.sub(finalTreasuryBalance)).to.equal(amount1.add(amount2))
      expect(finalBalance1.sub(initialBalance1)).to.equal(amount1)
      expect(finalBalance2.sub(initialBalance2)).to.equal(amount2)
    })

    it("allows canceling a proposal", async () => {
      // Only the proposer can cancel, so we'll use the deployer
      // Create a proposal
      const encodedFunctionCall = treasuryVault.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE])
      const proposeTx = await governor.propose(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        "Proposal to be canceled"
      )

      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events![0].args!.proposalId
      
      // Check proposal state
      let proposalState = await governor.state(proposalId)
      console.log(`Current Proposal State: ${proposalState}`)
      expect(proposalState.toString()).to.equal("0") // Pending
      
      // Cancel the proposal
      const descriptionHash = ethers.utils.id("Proposal to be canceled")
      await governor.cancel(
        [treasuryVault.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      // Check if proposal was canceled
      proposalState = await governor.state(proposalId)
      console.log(`Proposal State after cancellation: ${proposalState}`)
      expect(proposalState.toString()).to.equal("2") // Canceled
    })

    it("supports expected interfaces", async () => {
      // ERC165 interface ID
      const erc165InterfaceId = "0x01ffc9a7"
      
      // Test ERC165 interface support which Governor implements
      const supportsERC165 = await governor.supportsInterface(erc165InterfaceId)
      expect(supportsERC165).to.be.true
      
      // Test a non-supported interface ID (random bytes)
      const nonSupportedId = "0xffffffff"
      const doesNotSupport = await governor.supportsInterface(nonSupportedId)
      expect(doesNotSupport).to.be.false
    })
  })
})
