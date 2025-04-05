import { Contract } from "ethers"
import { ethers } from "hardhat"
import { assert, expect } from "chai"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("DAOSettings Complete Coverage Tests", async () => {
  let daoSettings: Contract
  let mockTimelock: Contract
  let deployer: SignerWithAddress
  let otherAccount: SignerWithAddress
  
  beforeEach(async () => {
    console.log("Setting up coverage test...")
    
    // Get signers
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    otherAccount = accounts[1]
    
    // Deploy the functional mock timelock for testing
    const MockTimelock = await ethers.getContractFactory("MockTimelockWithFunction")
    mockTimelock = await MockTimelock.deploy()
    await mockTimelock.deployed()
    console.log("Mock timelock deployed at:", mockTimelock.address)
    
    // Deploy the DAOSettings contract with the mock timelock address
    const DAOSettings = await ethers.getContractFactory("DAOSettings")
    daoSettings = await DAOSettings.deploy(mockTimelock.address)
    await daoSettings.deployed()
    console.log("DAOSettings deployed at:", daoSettings.address)
  })
  
  describe("Constructor", () => {
    it("should set the correct timelock role", async function() {
      const timelockRole = await daoSettings.TIMELOCK_ROLE()
      const hasRole = await daoSettings.hasRole(timelockRole, mockTimelock.address)
      assert.isTrue(hasRole, "Mock timelock should have TIMELOCK_ROLE")
    })
  })
  
  describe("Access Control", () => {
    it("should revert when non-timelock tries to set a string parameter", async function() {
      await expect(
        daoSettings.connect(otherAccount).setStringParameter("Test", "Key", "Value")
      ).to.be.revertedWith("Caller is not timelock")
    })
    
    it("should revert when non-timelock tries to set a numeric parameter", async function() {
      await expect(
        daoSettings.connect(otherAccount).setNumericParameter("Test", "Key", 100)
      ).to.be.revertedWith("Caller is not timelock")
    })
    
    it("should revert when non-timelock tries to set a boolean parameter", async function() {
      await expect(
        daoSettings.connect(otherAccount).setBoolParameter("Test", "Key", true)
      ).to.be.revertedWith("Caller is not timelock")
    })
  })
  
  describe("String Parameters", () => {
    it("should allow timelock to set string parameters", async function() {
      // Use the MockTimelockWithFunction to call the DAOSettings
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "Test", 
        "StringKey", 
        "StringValue"
      )
      
      // Check that the parameter was set
      const value = await daoSettings.getStringParameter("Test", "StringKey")
      assert.equal(value, "StringValue", "String parameter should be set correctly")
    })
    
    it("should emit an event when setting a string parameter", async function() {
      // We need to watch the DAOSettings contract for events, but call through the mock timelock
      await expect(
        mockTimelock.callSetStringParameter(
          daoSettings.address,
          "Test", 
          "EventKey", 
          "EventValue"
        )
      ).to.emit(daoSettings, "ParameterSet")
        .withArgs("Test", "EventKey", "EventValue")
    })
    
    it("should return empty string for non-existent string parameter", async function() {
      const value = await daoSettings.getStringParameter("NonExistent", "Key")
      assert.equal(value, "", "Non-existent parameter should return empty string")
    })
  })
  
  describe("Numeric Parameters", () => {
    it("should allow timelock to set numeric parameters", async function() {
      // Use the MockTimelockWithFunction to call the DAOSettings
      await mockTimelock.callSetNumericParameter(
        daoSettings.address,
        "Test", 
        "NumKey", 
        12345
      )
      
      // Check that the parameter was set
      const value = await daoSettings.getNumericParameter("Test", "NumKey")
      assert.equal(value.toString(), "12345", "Numeric parameter should be set correctly")
    })
    
    it("should emit an event when setting a numeric parameter", async function() {
      await expect(
        mockTimelock.callSetNumericParameter(
          daoSettings.address,
          "Test", 
          "EventNumKey", 
          54321
        )
      ).to.emit(daoSettings, "NumericParameterSet")
        .withArgs("Test", "EventNumKey", 54321)
    })
    
    it("should return zero for non-existent numeric parameter", async function() {
      const value = await daoSettings.getNumericParameter("NonExistent", "Key")
      assert.equal(value.toString(), "0", "Non-existent parameter should return zero")
    })
  })
  
  describe("Boolean Parameters", () => {
    it("should allow timelock to set boolean parameters", async function() {
      // Use the MockTimelockWithFunction to call the DAOSettings
      await mockTimelock.callSetBoolParameter(
        daoSettings.address,
        "Test", 
        "BoolKey", 
        true
      )
      
      // Check that the parameter was set
      const value = await daoSettings.getBoolParameter("Test", "BoolKey")
      assert.isTrue(value, "Boolean parameter should be set correctly")
    })
    
    it("should emit an event when setting a boolean parameter", async function() {
      await expect(
        mockTimelock.callSetBoolParameter(
          daoSettings.address,
          "Test", 
          "EventBoolKey", 
          true
        )
      ).to.emit(daoSettings, "BoolParameterSet")
        .withArgs("Test", "EventBoolKey", true)
    })
    
    it("should return false for non-existent boolean parameter", async function() {
      const value = await daoSettings.getBoolParameter("NonExistent", "Key")
      assert.isFalse(value, "Non-existent parameter should return false")
    })
  })
  
  describe("Multiple Parameters and Categories", () => {
    it("should correctly handle multiple parameters in the same category", async function() {
      // Set multiple parameters in the same category
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "MultiCategory", 
        "Key1", 
        "Value1"
      )
      
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "MultiCategory", 
        "Key2", 
        "Value2"
      )
      
      // Check that both parameters were set and are separate
      const value1 = await daoSettings.getStringParameter("MultiCategory", "Key1")
      const value2 = await daoSettings.getStringParameter("MultiCategory", "Key2")
      
      assert.equal(value1, "Value1", "First parameter should be set correctly")
      assert.equal(value2, "Value2", "Second parameter should be set correctly")
    })
    
    it("should correctly handle the same key in different categories", async function() {
      // Set the same key in different categories
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "Category1", 
        "SameKey", 
        "Value1"
      )
      
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "Category2", 
        "SameKey", 
        "Value2"
      )
      
      // Check that both parameters were set and are separate
      const value1 = await daoSettings.getStringParameter("Category1", "SameKey")
      const value2 = await daoSettings.getStringParameter("Category2", "SameKey")
      
      assert.equal(value1, "Value1", "First parameter should be set correctly")
      assert.equal(value2, "Value2", "Second parameter should be set correctly")
    })
    
    it("should allow updating parameters with the same key", async function() {
      // Set and then update a parameter
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "Test", 
        "UpdateKey", 
        "InitialValue"
      )
      
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "Test", 
        "UpdateKey", 
        "UpdatedValue"
      )
      
      // Check that the parameter was updated
      const value = await daoSettings.getStringParameter("Test", "UpdateKey")
      assert.equal(value, "UpdatedValue", "Parameter should be updated correctly")
    })
  })
  
  describe("Different Parameter Types", () => {
    it("should handle the same key for different parameter types", async function() {
      // Set the same key as different parameter types
      await mockTimelock.callSetStringParameter(
        daoSettings.address,
        "TypeTest", 
        "TypeKey", 
        "StringValue"
      )
      
      await mockTimelock.callSetNumericParameter(
        daoSettings.address,
        "TypeTest", 
        "TypeKey", 
        12345
      )
      
      await mockTimelock.callSetBoolParameter(
        daoSettings.address,
        "TypeTest", 
        "TypeKey", 
        true
      )
      
      // Check that all parameters were set correctly
      const stringValue = await daoSettings.getStringParameter("TypeTest", "TypeKey")
      const numericValue = await daoSettings.getNumericParameter("TypeTest", "TypeKey")
      const boolValue = await daoSettings.getBoolParameter("TypeTest", "TypeKey")
      
      assert.equal(stringValue, "StringValue", "String parameter should be set correctly")
      assert.equal(numericValue.toString(), "12345", "Numeric parameter should be set correctly")
      assert.isTrue(boolValue, "Boolean parameter should be set correctly")
    })
  })
}) 