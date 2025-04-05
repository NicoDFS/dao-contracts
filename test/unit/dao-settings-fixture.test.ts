import { ethers, deployments } from "hardhat"
import { assert } from "chai"

describe("DAOSettings Fixture Test", async () => {
  it("should load the fixture", async function() {
    // Increase timeout for this test specifically
    this.timeout(300000); // 5 minutes
    
    console.log("Starting fixture test...")
    console.log("Deploying fixture...")
    
    // Try/catch to see the specific error
    try {
      await deployments.fixture(["all"])
      console.log("Fixture deployed successfully")
      
      // Verify that the required contracts exist
      console.log("Checking if TimeLock is deployed...")
      const timeLock = await ethers.getContract("TimeLock")
      console.log("TimeLock contract deployed at:", timeLock.address)
      
      assert.ok(timeLock.address, "TimeLock contract should be deployed");
      console.log("Test passed!")
    } catch (error) {
      console.error("Error deploying fixture:", error)
      throw error;
    }
  })
}) 