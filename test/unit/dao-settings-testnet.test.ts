import { Contract } from "ethers"
import { ethers } from "hardhat"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("DAOSettings Testnet Tests", async () => {
  let daoSettings: Contract
  let deployer: SignerWithAddress
  let otherAccount: SignerWithAddress
  
  // Use the actual testnet timelock address
  const TESTNET_TIMELOCK_ADDRESS = "0xAd338da8A2dDE5B5Fe08362c379c66D18Bb24151"
  
  beforeEach(async () => {
    console.log("Starting testnet test setup...")
    
    // Get signers
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    otherAccount = accounts[1]
    
    // Deploy the DAOSettings contract with the existing testnet timelock
    console.log("Deploying DAOSettings with testnet TimeLock:", TESTNET_TIMELOCK_ADDRESS)
    const DAOSettings = await ethers.getContractFactory("DAOSettings")
    daoSettings = await DAOSettings.deploy(TESTNET_TIMELOCK_ADDRESS)
    await daoSettings.deployed()
    console.log("DAOSettings deployed at:", daoSettings.address)
  })
  
  it("should set the correct timelock role", async function() {
    console.log("Running role test...")
    const timelockRole = await daoSettings.TIMELOCK_ROLE()
    
    console.log("TIMELOCK_ROLE:", timelockRole)
    console.log("Using testnet TimeLock address:", TESTNET_TIMELOCK_ADDRESS)
    
    const hasRole = await daoSettings.hasRole(timelockRole, TESTNET_TIMELOCK_ADDRESS)
    assert.isTrue(hasRole, "TimeLock should have TIMELOCK_ROLE")
  })
  
  it("should revert when non-timelock tries to set a parameter", async function() {
    await expect(
      daoSettings.connect(otherAccount).setStringParameter("Test", "Key", "Value")
    ).to.be.revertedWith("Caller is not timelock")
  })
  
  it("should have the right getters for non-existent parameters", async function() {
    // Test string parameter
    const stringParam = await daoSettings.getStringParameter("NonExistent", "Key")
    assert.equal(stringParam, "", "Non-existent string parameter should return empty string")
    
    // Test numeric parameter
    const numParam = await daoSettings.getNumericParameter("NonExistent", "Key")
    assert.equal(numParam.toString(), "0", "Non-existent numeric parameter should return 0")
    
    // Test boolean parameter
    const boolParam = await daoSettings.getBoolParameter("NonExistent", "Key")
    assert.equal(boolParam, false, "Non-existent boolean parameter should return false")
  })
}) 