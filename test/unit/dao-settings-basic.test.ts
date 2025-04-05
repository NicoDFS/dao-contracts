import { Contract } from "ethers"
import { ethers } from "hardhat"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("DAOSettings Basic Tests", async () => {
  let daoSettings: Contract
  let mockTimelock: Contract
  let deployer: SignerWithAddress
  let otherAccount: SignerWithAddress
  
  beforeEach(async () => {
    console.log("Starting basic test setup...")
    
    // Get signers
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    otherAccount = accounts[1]
    
    // Deploy a mock timelock for testing
    console.log("Deploying a mock timelock...")
    const MockTimelock = await ethers.getContractFactory("MockTimelock", deployer)
    mockTimelock = await MockTimelock.deploy()
    await mockTimelock.deployed()
    console.log("Mock timelock deployed at:", mockTimelock.address)
    
    // Deploy the DAOSettings contract with the mock timelock
    console.log("Deploying DAOSettings...")
    const DAOSettings = await ethers.getContractFactory("DAOSettings", deployer)
    daoSettings = await DAOSettings.deploy(mockTimelock.address)
    await daoSettings.deployed()
    console.log("DAOSettings deployed at:", daoSettings.address)
  })
  
  it("should set the correct timelock role", async function() {
    console.log("Running role test...")
    const timelockRole = await daoSettings.TIMELOCK_ROLE()
    
    console.log("TIMELOCK_ROLE:", timelockRole)
    console.log("Mock timelock address:", mockTimelock.address)
    
    const hasRole = await daoSettings.hasRole(timelockRole, mockTimelock.address)
    assert.isTrue(hasRole, "Mock timelock should have TIMELOCK_ROLE")
  })
  
  it("should revert when non-timelock tries to set a parameter", async function() {
    await expect(
      daoSettings.connect(otherAccount).setStringParameter("Test", "Key", "Value")
    ).to.be.revertedWith("Caller is not timelock")
  })
}) 