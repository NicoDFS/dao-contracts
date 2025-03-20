import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployGovernanceToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  log("----------------------------------------------------")
  log("Deploying GovernanceToken and waiting for confirmations...")
  const governanceToken = await deploy("GovernanceToken", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 3,
  })
  log(`GovernanceToken at ${governanceToken.address}`)
  if (!developmentChains.includes(network.name)) {
    if (process.env.KALYSCAN_API_KEY) {
      log(`Attempting to verify on ${network.name} with API key of length: ${process.env.KALYSCAN_API_KEY.length}`)
      await verify(governanceToken.address, [])
    } else {
      log("Skipping verification: KALYSCAN_API_KEY environment variable is not set")
    }
  }
  
  // On local development networks, automatically deposit tokens for testing
  if (developmentChains.includes(network.name)) {
    log("Local network detected. Depositing native tokens for testing...")
    const governanceTokenContract = await ethers.getContractAt("GovernanceToken", governanceToken.address)
    const depositAmount = ethers.utils.parseEther("10") // Deposit 10 native tokens for testing
    
    const depositTx = await governanceTokenContract.deposit({ 
      value: depositAmount,
    })
    await depositTx.wait(1)
    log(`Deposited ${ethers.utils.formatEther(depositAmount)} native tokens for testing`)
  } else {
    log("Live network detected. Skipping automatic token deposit.")
    log("Note: You will need to manually deposit native tokens to get governance tokens and voting power.")
  }
  
  log(`Delegating to ${deployer}`)
  await delegate(governanceToken.address, deployer)
  log("Delegated!")
}

const delegate = async (governanceTokenAddress: string, delegatedAccount: string) => {
  const governanceToken = await ethers.getContractAt("GovernanceToken", governanceTokenAddress)
  const transactionResponse = await governanceToken.delegate(delegatedAccount)
  await transactionResponse.wait(1)
  console.log(`Checkpoints: ${await governanceToken.numCheckpoints(delegatedAccount)}`)
}

export default deployGovernanceToken
deployGovernanceToken.tags = ["all", "governor"]
