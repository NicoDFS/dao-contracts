import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployTreasuryVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  log("----------------------------------------------------")
  log("Deploying TreasuryVault and waiting for confirmations...")
  const treasuryVault = await deploy("TreasuryVault", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 3,
  })
  log(`TreasuryVault at ${treasuryVault.address}`)
  if (!developmentChains.includes(network.name) && process.env.KALYSCAN_API_KEY) {
    await verify(treasuryVault.address, [])
  }
  
  const treasuryVaultContract = await ethers.getContractAt("TreasuryVault", treasuryVault.address)
  const timeLock = await ethers.getContract("TimeLock")
  
  // Check current owner
  const currentOwner = await treasuryVaultContract.owner()
  log(`Current TreasuryVault owner: ${currentOwner}`)
  log(`TimeLock address: ${timeLock.address}`)
  
  // Only transfer ownership if the deployer is still the owner and it's not already owned by TimeLock
  if (currentOwner.toLowerCase() === deployer.toLowerCase() && 
      currentOwner.toLowerCase() !== timeLock.address.toLowerCase()) {
    log("Transferring ownership of TreasuryVault to TimeLock...")
    try {
      const transferTx = await treasuryVaultContract.transferOwnership(timeLock.address)
      await transferTx.wait(1)
      log("✅ Ownership transferred successfully")
    } catch (error) {
      log("❌ Failed to transfer ownership")
      console.error(error)
      log("Deployment can continue - ownership transfer can be done later if needed")
    }
  } else if (currentOwner.toLowerCase() === timeLock.address.toLowerCase()) {
    log("TimeLock is already the owner of TreasuryVault, skipping transfer")
  } else {
    log(`WARNING: Current owner is neither deployer nor TimeLock. Owner is: ${currentOwner}`)
    log("Ownership transfer skipped. You may need to handle this manually.")
  }
}

export default deployTreasuryVault
deployTreasuryVault.tags = ["all", "treasuryVault"]
