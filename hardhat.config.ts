import "@typechain/hardhat"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "dotenv/config"
import "solidity-coverage"
import "hardhat-deploy"
import { HardhatUserConfig } from "hardhat/config"

const KALYCHAIN_RPC_URL =
  process.env.KALYCHAIN_RPC_URL || "https://rpc.kalychain.io/rpc"
const TESTNET_RPC_URL =
  process.env.TESTNET_RPC_URL || "https://testnetrpc.kalychain.io/rpc"
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const KALYSCAN_API_KEY = process.env.KALYSCAN_API_KEY || ""

// Debug - remove this after confirming
console.log("KALYSCAN_API_KEY loaded:", KALYSCAN_API_KEY ? "Yes (length: " + KALYSCAN_API_KEY.length + ")" : "No")

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      chainId: 31337,
      allowUnlimitedContractSize: true
    },
    testnet: {
      url: TESTNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 3889,
      gas: 3000000,
      gasPrice: 21000000000,
      timeout: 1000000,
    },
    kalychain: {
      url: KALYCHAIN_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 3888,
      gas: 3000000,
      gasPrice: 21000000000,
      timeout: 1000000,
    },
  },
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      kalychain: KALYSCAN_API_KEY,
      testnet: KALYSCAN_API_KEY,
    },
    customChains: [
      {
        network: "kalychain",
        chainId: 3888,
        urls: {
          apiURL: "https://kalyscan.io/api",
          browserURL: "https://kalyscan.io/",
        },
      },
      {
        network: "testnet",
        chainId: 3889,
        urls: {
          apiURL: "https://testnet.kalyscan.io/api",
          browserURL: "https://testnet.kalyscan.io/",
        },
      },
    ],
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    // coinmarketcap: COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
}

export default config
