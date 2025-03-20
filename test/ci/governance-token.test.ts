// Simplified tests for CI environment
import { ethers } from "hardhat"
import { assert, expect } from "chai"

describe("GovernanceToken CI Tests", async () => {
  let governanceToken: any
  let deployer: any
  let user: any

  before(async () => {
    console.log("Setting up minimal CI test environment...")
    
    // Get signers
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    user = accounts[1]
    
    // Deploy only the GovernanceToken contract directly
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken")
    governanceToken = await GovernanceToken.deploy()
    await governanceToken.deployed()
    
    console.log("CI test setup complete")
  })

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
  
  it("allows depositing tokens via receive function", async () => {
    const depositAmount = ethers.utils.parseEther("0.5")
    
    // Check balance before deposit
    const balanceBefore = await governanceToken.balanceOf(user.address)
    
    // Send ETH directly to the contract (triggers receive)
    await user.sendTransaction({
      to: governanceToken.address,
      value: depositAmount
    })
    
    // Check balance after deposit
    const balanceAfter = await governanceToken.balanceOf(user.address)
    
    // Check that balance increased by exactly the deposit amount
    assert.equal(
      balanceAfter.sub(balanceBefore).toString(), 
      depositAmount.toString()
    )
  })
  
  it("allows withdrawing native tokens", async () => {
    const depositAmount = ethers.utils.parseEther("0.25")
    
    // Deposit first
    await governanceToken.connect(user).deposit({
      value: depositAmount
    })
    
    // Get token balance before withdrawal
    const tokenBalanceBefore = await governanceToken.balanceOf(user.address)
    
    // Check ETH balance before withdrawal
    const balanceBefore = await ethers.provider.getBalance(user.address)
    
    // Withdraw
    const tx = await governanceToken.connect(user).withdraw(depositAmount)
    const receipt = await tx.wait(1)
    const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
    
    // Check balance after withdrawal
    const balanceAfter = await ethers.provider.getBalance(user.address)
    const tokenBalanceAfter = await governanceToken.balanceOf(user.address)
    
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
  
  it("supports voting functionality", async () => {
    // Test delegate function
    await governanceToken.connect(user).delegate(user.address)
    
    // Get voting power
    const votes = await governanceToken.getVotes(user.address)
    
    // Should have some voting power from previous deposits
    expect(votes.gt(0)).to.be.true
  })
}); 