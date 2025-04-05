import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployDAOSettings: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  
  let timelockAddress: string
  
  // Use existing timelock address on mainnet
  if (network.name === "kalychain") {
    timelockAddress = "0xA11572e9724dfeD2BCf8ecc9bfEd18CC609C4c6D"
    log(`Using existing mainnet TimeLock at: ${timelockAddress}`)
  }
  // Use existing timelock address on testnet
  else if (network.name === "testnet") {
    timelockAddress = "0xAd338da8A2dDE5B5Fe08362c379c66D18Bb24151"
    log(`Using existing testnet TimeLock at: ${timelockAddress}`)
  } else {
    // For other networks, get the deployed TimeLock address
    try {
      const timeLock = await ethers.getContract("TimeLock")
      timelockAddress = timeLock.address
      log(`Found deployed TimeLock at: ${timelockAddress}`)
    } catch (error) {
      log("Warning: TimeLock contract not found. Make sure it's deployed before DAOSettings.")
      log("If this is an issue, please deploy TimeLock first.")
      throw error
    }
  }
  
  log("----------------------------------------------------")
  log("Deploying DAOSettings contract and waiting for confirmations...")
  
  const daoSettings = await deploy("DAOSettings", {
    from: deployer,
    args: [timelockAddress],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 3,
  })
  
  log(`DAOSettings deployed at ${daoSettings.address}`)
  
  // Verify the contract on explorer if not on a development chain
  if (!developmentChains.includes(network.name) && process.env.KALYSCAN_API_KEY) {
    log("Verifying DAOSettings contract on blockchain explorer...")
    await verify(daoSettings.address, [timelockAddress])
  } else if (!process.env.KALYSCAN_API_KEY) {
    log("Skipping verification: KALYSCAN_API_KEY environment variable is not set")
  }
  
  log("DAOSettings contract setup complete!")
}

export default deployDAOSettings
deployDAOSettings.tags = ["all", "daosettings"] 