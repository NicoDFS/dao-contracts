import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
 
import {   ADDRESS_ZERO } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const setupContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments  } = hre
  const { log } = deployments
  const { deployer } = await getNamedAccounts()
   
  const timeLock = await ethers.getContract("TimeLock", deployer)
  const governor = await ethers.getContract("GovernorContract", deployer)

  log("----------------------------------------------------")
  log("Setting up contracts for roles...")
  
  const proposerRole = await timeLock.PROPOSER_ROLE()
  const executorRole = await timeLock.EXECUTOR_ROLE()
  const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE()

  // Check if roles are already set up
  log("Checking current role assignments...")
  const governorIsProposer = await timeLock.hasRole(proposerRole, governor.address)
  const zeroAddressIsExecutor = await timeLock.hasRole(executorRole, ADDRESS_ZERO)
  const deployerIsAdmin = await timeLock.hasRole(adminRole, deployer)

  // Only perform setup actions if needed
  if (!governorIsProposer) {
    log("Granting proposer role to governor...")
    try {
      const proposerTx = await timeLock.grantRole(proposerRole, governor.address)
      await proposerTx.wait(1)
      log("✅ Proposer role granted")
    } catch (error) {
      log("❌ Failed to grant proposer role")
      console.error(error)
    }
  } else {
    log("Governor already has proposer role, skipping...")
  }

  if (!zeroAddressIsExecutor) {
    log("Granting executor role to zero address...")
    try {
      const executorTx = await timeLock.grantRole(executorRole, ADDRESS_ZERO)
      await executorTx.wait(1)
      log("✅ Executor role granted")
    } catch (error) {
      log("❌ Failed to grant executor role")
      console.error(error)
    }
  } else {
    log("Zero address already has executor role, skipping...")
  }

  if (deployerIsAdmin) {
    log("Revoking admin role from deployer...")
    try {
      const revokeTx = await timeLock.revokeRole(adminRole, deployer)
      await revokeTx.wait(1)
      log("✅ Admin role revoked")
    } catch (error) {
      log("❌ Failed to revoke admin role")
      console.error(error)
      log("WARNING: Deployer still has admin rights to the timelock")
    }
  } else {
    log("Deployer no longer has admin role, skipping...")
  }
  
  log("Setup complete!")
}

export default setupContracts
setupContracts.tags = ["all", "setup"]
