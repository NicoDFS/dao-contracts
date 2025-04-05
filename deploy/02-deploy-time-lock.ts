import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains, MIN_DELAY } from "../helper-hardhat-config"

const deployTimeLock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  log("----------------------------------------------------")
  log("Deploying TimeLock and waiting for confirmations...")
  const timeLock = await deploy("TimeLock", {
    from: deployer,
    /**
     * Here we can set any address in admin role also zero address.
     * previously deployer has given admin role then
     * renounced as well. in later section so we are doing the same by giving admin role to
     * deployer and then renounced to keep the tutorial same.
     */
    args: [MIN_DELAY, [], [], deployer],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 3,
  })
  log(`TimeLock at ${timeLock.address}`)
  if (!developmentChains.includes(network.name) && process.env.KALYSCAN_API_KEY) {
    await verify(timeLock.address, [], "contracts/governance_standard/TimeLock.sol:TimeLock")
  }
}

export default deployTimeLock
deployTimeLock.tags = ["all", "timelock"]
