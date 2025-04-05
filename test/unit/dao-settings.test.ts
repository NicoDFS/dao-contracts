import { Contract } from "ethers"
import { deployments, ethers } from "hardhat"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { MIN_DELAY } from "../../helper-hardhat-config"
import { moveBlocks } from "../../utils/move-blocks"
import { moveTime } from "../../utils/move-time"

describe("DAOSettings Tests", async () => {
  let daoSettings: Contract
  let governor: Contract
  let timeLock: Contract
  let governanceToken: Contract
  let deployer: SignerWithAddress
  let voter: SignerWithAddress
  let nonTimelockUser: SignerWithAddress
  
  beforeEach(async () => {
    console.log("Starting beforeEach hook...")
    
    // First deploy all existing contracts with the fixture
    console.log("Deploying fixture...")
    await deployments.fixture(["all"])
    console.log("Fixture deployed")
    
    // Get existing contracts
    console.log("Getting Governor contract...")
    governor = await ethers.getContract("GovernorContract")
    console.log("Getting TimeLock contract...")
    timeLock = await ethers.getContract("TimeLock")
    console.log("Getting GovernanceToken contract...")
    governanceToken = await ethers.getContract("GovernanceToken")
    console.log("Got all existing contracts")
    
    // Get signers
    console.log("Getting signers...")
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    voter = accounts[1]
    nonTimelockUser = accounts[2]
    console.log("Got signers")
    
    // Deploy the DAOSettings contract separately
    console.log("Deploying DAOSettings...")
    const DAOSettings = await ethers.getContractFactory("DAOSettings")
    console.log("Deploying DAOSettings with TimeLock address:", timeLock.address)
    daoSettings = await DAOSettings.deploy(timeLock.address)
    console.log("Waiting for DAOSettings deployment...")
    await daoSettings.deployed()
    console.log("DAOSettings deployed at:", daoSettings.address)
    
    // Give voter some governance tokens for voting
    console.log("Giving voter governance tokens...")
    await governanceToken.connect(voter).deposit({
      value: ethers.utils.parseEther("5")
    })
    
    // Delegate voting power to self
    console.log("Delegating voting power...")
    await governanceToken.connect(voter).delegate(voter.address)
    console.log("beforeEach hook complete")
  })
  
  // Run a simple test first to diagnose the issue
  it("should verify initial setup", async function() {
    console.log("Running first test")
    assert.isDefined(daoSettings.address, "DAOSettings should be deployed")
    console.log("DAOSettings address:", daoSettings.address)
    console.log("TimeLock address:", timeLock.address)
  })
  
  describe("Constructor & Setup", () => {
    it("should set the TimeLock as the TIMELOCK_ROLE", async () => {
      const timelockRole = await daoSettings.TIMELOCK_ROLE()
      const hasRole = await daoSettings.hasRole(timelockRole, timeLock.address)
      assert.isTrue(hasRole, "TimeLock should have TIMELOCK_ROLE")
    })
  })
  
  describe("Access Control", () => {
    it("should revert when non-timelock tries to set string parameter", async () => {
      await expect(
        daoSettings.connect(nonTimelockUser).setStringParameter("Community", "Mission", "Value")
      ).to.be.revertedWith("Caller is not timelock")
    })
    
    it("should revert when non-timelock tries to set numeric parameter", async () => {
      await expect(
        daoSettings.connect(nonTimelockUser).setNumericParameter("Technical", "MaxTokens", 1000)
      ).to.be.revertedWith("Caller is not timelock")
    })
    
    it("should revert when non-timelock tries to set bool parameter", async () => {
      await expect(
        daoSettings.connect(nonTimelockUser).setBoolParameter("Features", "EnableStaking", true)
      ).to.be.revertedWith("Caller is not timelock")
    })
  })
  
  describe("Parameter Operations via Governance", () => {
    it("can propose, vote, queue, and execute to set a string parameter", async () => {
      // Create call data for setting string parameter
      const categoryStr = "Community"
      const keyStr = "Mission"
      const valueStr = "Building decentralized governance for Kaly Chain ecosystem"
      
      const encodedFunctionCall = daoSettings.interface.encodeFunctionData(
        "setStringParameter",
        [categoryStr, keyStr, valueStr]
      )
      
      // Propose
      const proposalDescription = "Set Community Mission statement"
      const proposeTx = await governor.propose(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        proposalDescription
      )
      
      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events[0].args.proposalId
      
      // Move blocks forward to start voting period
      await moveBlocks(2)
      
      // Vote
      const voteTx = await governor.connect(voter).castVoteWithReason(
        proposalId,
        1, // vote in favor
        "I support this mission statement"
      )
      await voteTx.wait(1)
      
      // Move blocks forward to end voting period
      await moveBlocks(5)
      
      // Queue
      const descriptionHash = ethers.utils.id(proposalDescription)
      const queueTx = await governor.queue(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await queueTx.wait(1)
      
      // Move time forward for timelock
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute
      const executeTx = await governor.execute(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await executeTx.wait(1)
      
      // Verify parameter was set
      const paramKey = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["string", "string"],
          [categoryStr, keyStr]
        )
      )
      const storedValue = await daoSettings.getStringParameter(categoryStr, keyStr)
      assert.equal(storedValue, valueStr, "String parameter should be set correctly")
    })
    
    it("can propose, vote, queue, and execute to set a numeric parameter", async () => {
      // Create call data for setting numeric parameter
      const categoryStr = "Technical"
      const keyStr = "MaxSupply"
      const valueNum = ethers.utils.parseEther("1000000") // 1M tokens
      
      const encodedFunctionCall = daoSettings.interface.encodeFunctionData(
        "setNumericParameter",
        [categoryStr, keyStr, valueNum]
      )
      
      // Propose
      const proposalDescription = "Set Max Token Supply"
      const proposeTx = await governor.propose(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        proposalDescription
      )
      
      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events[0].args.proposalId
      
      // Move blocks forward to start voting period
      await moveBlocks(2)
      
      // Vote
      const voteTx = await governor.connect(voter).castVoteWithReason(
        proposalId,
        1, // vote in favor
        "I agree with the max supply"
      )
      await voteTx.wait(1)
      
      // Move blocks forward to end voting period
      await moveBlocks(5)
      
      // Queue
      const descriptionHash = ethers.utils.id(proposalDescription)
      const queueTx = await governor.queue(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await queueTx.wait(1)
      
      // Move time forward for timelock
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute
      const executeTx = await governor.execute(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await executeTx.wait(1)
      
      // Verify parameter was set
      const storedValue = await daoSettings.getNumericParameter(categoryStr, keyStr)
      expect(storedValue).to.equal(valueNum)
    })
    
    it("can propose, vote, queue, and execute to set a boolean parameter", async () => {
      // Create call data for setting boolean parameter
      const categoryStr = "Features"
      const keyStr = "StakingEnabled"
      const valueBool = true
      
      const encodedFunctionCall = daoSettings.interface.encodeFunctionData(
        "setBoolParameter",
        [categoryStr, keyStr, valueBool]
      )
      
      // Propose
      const proposalDescription = "Enable staking feature"
      const proposeTx = await governor.propose(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        proposalDescription
      )
      
      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events[0].args.proposalId
      
      // Move blocks forward to start voting period
      await moveBlocks(2)
      
      // Vote
      const voteTx = await governor.connect(voter).castVoteWithReason(
        proposalId,
        1, // vote in favor
        "Staking should be enabled"
      )
      await voteTx.wait(1)
      
      // Move blocks forward to end voting period
      await moveBlocks(5)
      
      // Queue
      const descriptionHash = ethers.utils.id(proposalDescription)
      const queueTx = await governor.queue(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await queueTx.wait(1)
      
      // Move time forward for timelock
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute
      const executeTx = await governor.execute(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      await executeTx.wait(1)
      
      // Verify parameter was set
      const storedValue = await daoSettings.getBoolParameter(categoryStr, keyStr)
      assert.equal(storedValue, valueBool, "Boolean parameter should be set correctly")
    })
  })
  
  describe("Getter Functions", () => {
    it("should return empty string for non-existent string parameter", async () => {
      const value = await daoSettings.getStringParameter("NonExistent", "Parameter")
      assert.equal(value, "", "Should return empty string for non-existent parameter")
    })
    
    it("should return zero for non-existent numeric parameter", async () => {
      const value = await daoSettings.getNumericParameter("NonExistent", "Parameter")
      assert.equal(value.toString(), "0", "Should return zero for non-existent parameter")
    })
    
    it("should return false for non-existent boolean parameter", async () => {
      const value = await daoSettings.getBoolParameter("NonExistent", "Parameter")
      assert.equal(value, false, "Should return false for non-existent parameter")
    })
  })
  
  describe("Events", () => {
    it("should emit ParameterSet event when setting string parameter through governance", async () => {
      // Set up the proposal for setting a string parameter
      const categoryStr = "Events"
      const keyStr = "TestEvent"
      const valueStr = "Event Value"
      
      const encodedFunctionCall = daoSettings.interface.encodeFunctionData(
        "setStringParameter",
        [categoryStr, keyStr, valueStr]
      )
      
      // Create and execute the proposal through governance
      const proposalDescription = "Set test event parameter"
      const proposeTx = await governor.propose(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        proposalDescription
      )
      
      const proposeReceipt = await proposeTx.wait(1)
      const proposalId = proposeReceipt.events[0].args.proposalId
      
      await moveBlocks(2)
      await governor.connect(voter).castVoteWithReason(proposalId, 1, "Testing events")
      await moveBlocks(5)
      
      const descriptionHash = ethers.utils.id(proposalDescription)
      await governor.queue([daoSettings.address], [0], [encodedFunctionCall], descriptionHash)
      
      await moveTime(MIN_DELAY + 1)
      await moveBlocks(1)
      
      // Execute and check for the event
      const executeTx = await governor.execute(
        [daoSettings.address],
        [0],
        [encodedFunctionCall],
        descriptionHash
      )
      
      const receipt = await executeTx.wait(1)
      
      // Find the event in the transaction logs
      const eventLog = receipt.events.find(
        (event: any) => {
          try {
            return event.address.toLowerCase() === daoSettings.address.toLowerCase() &&
                  event.topics[0] === daoSettings.interface.getEventTopic("ParameterSet")
          } catch (e) {
            return false
          }
        }
      )
      
      assert.exists(eventLog, "ParameterSet event should be emitted")
      
      // Verify the event data
      const decodedEvent = daoSettings.interface.decodeEventLog(
        "ParameterSet",
        eventLog.data,
        eventLog.topics
      )
      
      assert.equal(decodedEvent.key, keyStr, "Event key should match")
      assert.equal(decodedEvent.value, valueStr, "Event value should match")
    })
  })
  
  // Testing multiple parameters in the same category
  describe("Multiple Parameters", () => {
    it("should handle multiple parameters in the same category correctly", async () => {
      // Create governance proposal to set multiple parameters
      const category = "MultiTest"
      const keyStr1 = "StringParam"
      const valueStr1 = "String Value"
      const keyStr2 = "StringParam2"
      const valueStr2 = "Another String Value"
      
      // Create two separate function calls
      const encodedCall1 = daoSettings.interface.encodeFunctionData(
        "setStringParameter", 
        [category, keyStr1, valueStr1]
      )
      
      const encodedCall2 = daoSettings.interface.encodeFunctionData(
        "setStringParameter", 
        [category, keyStr2, valueStr2]
      )
      
      // Create and execute governance proposals for both
      // First parameter
      await executeGovernanceProposal(
        [daoSettings.address],
        [0],
        [encodedCall1],
        "Set first string parameter"
      )
      
      // Second parameter
      await executeGovernanceProposal(
        [daoSettings.address],
        [0],
        [encodedCall2],
        "Set second string parameter"
      )
      
      // Verify both parameters were set correctly
      const value1 = await daoSettings.getStringParameter(category, keyStr1)
      const value2 = await daoSettings.getStringParameter(category, keyStr2)
      
      assert.equal(value1, valueStr1, "First parameter should be set correctly")
      assert.equal(value2, valueStr2, "Second parameter should be set correctly")
    })
  })
  
  // Helper function to quickly execute governance proposals
  async function executeGovernanceProposal(
    targets: string[],
    values: number[],
    calldatas: string[],
    description: string
  ) {
    // Propose
    const proposeTx = await governor.propose(targets, values, calldatas, description)
    const proposeReceipt = await proposeTx.wait(1)
    const proposalId = proposeReceipt.events[0].args.proposalId
    
    // Move blocks and vote
    await moveBlocks(2)
    await governor.connect(voter).castVoteWithReason(proposalId, 1, "Supporting this proposal")
    await moveBlocks(5)
    
    // Queue and execute
    const descriptionHash = ethers.utils.id(description)
    await governor.queue(targets, values, calldatas, descriptionHash)
    await moveTime(MIN_DELAY + 1)
    await moveBlocks(1)
    const executeTx = await governor.execute(targets, values, calldatas, descriptionHash)
    await executeTx.wait(1)
    
    return executeTx
  }
}) 