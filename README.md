# KalyDAO

[![Solidity Coverage](https://img.shields.io/badge/Solidity%20Coverage-100%25-brightgreen.svg)](https://github.com/KalyCoinProject/dao-contracts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A decentralized governance system for Kaly Chain, enabling on-chain governance using native KLC token for voting power.

## Features

- **Native Token Governance**: Use the KLC native token for voting by wrapping it
- **Secure Treasury Management**: Store and manage funds controlled by governance
- **Transparent Governance Process**: Propose, vote, queue, and execute changes on-chain
- **Timelock Security**: Every governance action requires a time delay for security

## Installation

1. Clone this repo:
```bash
git clone https://github.com/KalyCoinProject/dao-contracts
cd dao-contracts
```

2. Install dependencies:
```bash
yarn
# or
npm i 
```

3. Run the test suite:
```bash
yarn hardhat test
# or
npx hardhat test
```

4. View test coverage:
```bash
yarn hardhat coverage
# or
npx hardhat coverage
```

## Test Suite Details

Our test suite verifies all aspects of the DAO functionality:

### 1. GovernanceToken Tests
- **Deposit/Withdraw**: Verifies users can wrap native KLC to get gKLC tokens and unwrap them back
- **Voting Power**: Confirms governance tokens provide voting power after delegation
- **Token Transfers**: Tests that token balances update correctly after transfers

### 2. TreasuryVault Tests
- **Ownership Control**: Only governance can access treasury functions
- **Fund Management**: Tests sending and receiving both native tokens and ERC20 tokens
- **Proposal Execution**: Verifies treasury operations can be executed through governance

### 3. Governance Process Tests
- **Full Governance Flow**: Tests the entire proposal → vote → queue → execute pipeline
- **Financial Transactions**: Validates governance can manage treasury assets
- **Timelock Protection**: Ensures proper delays between approval and execution

## Deployment to Testnet

1. Add a `.env` file with the same contents of `.env.example`, but replaced with your variables.

⚠️ **WARNING** ⚠️
> DO NOT PUSH YOUR PRIVATE_KEY TO GITHUB

2. Deploy to a testnet:
```bash
npx hardhat deploy --network [NETWORK_NAME]
```

## Usage Guide

### On-Chain Governance Process

Here's what happens in our DAO system:

1. **Token Setup**: We deploy a Governance Token (gKLC) that wraps the native KLC token to enable voting
   - Users deposit native KLC to receive gKLC with voting power
   - Users can withdraw their KLC at any time by burning gKLC

2. **Timelock Deployment**: We deploy a Timelock contract that adds security by enforcing delays
   - The timelock is the contract that will handle all the money, ownerships, etc
   - Provides a buffer period for users to review proposed changes

3. **Governance Contract**: We deploy our Governance contract to handle proposals and voting
   - The Governance contract manages proposals and voting, but the Timelock executes!
   - Uses the popular OpenZeppelin Governor framework

4. **Treasury Management**: We deploy a Treasury Vault, owned by the governance process
   - Can receive and send both native KLC and any ERC20 tokens
   - All operations require passing a governance proposal

5. **Proposal Lifecycle**:
   - **Propose**: Anyone with enough voting power can propose actions
   - **Vote**: Token holders vote during the voting period
   - **Queue**: Approved proposals are queued in the timelock
   - **Execute**: After the timelock delay, the proposal can be executed

## Manual Testing on Local Network

You can manually test the governance flow:

1. Setup local blockchain:
```bash
yarn hardhat node
```

2. Propose a new value to be added to our Treasury contract:
```bash
yarn hardhat run scripts/propose.ts --network localhost
```

3. Vote on that proposal:
```bash
yarn hardhat run scripts/vote.ts --network localhost
```

4. Queue & Execute proposal:
```bash
yarn hardhat run scripts/queue-and-execute.ts --network localhost
```

## Deplyments

KalyChain Mainnet:
```bash
Governance Token: 0x4BA2369743c4249ea3f6777CaF433c76dBBa657a
Governor Contract: 0xF6C1af62e59D3085f10ac6F782cFDaE23E6352dE
Timelock Contract: 0xA11572e9724dfeD2BCf8ecc9bfEd18CC609C4c6D
Treasury Contract: 0x92564ec0d22BBd5e3FF978B977CA968e6c7d1c44
DAOSettings Contract: 0xeD23Fda4A23C0b6950dEcD55C4Bd757f644E0578
```

KalyChain Testnet: 
```bash
Governance Token: 0x8Ab92A0B7Ec5a9EA877AD3b15bfEFB795aA24C33
Governor Contract: 0x92177A348367D0122e043448e7f308ba989CFb3F
Timelock Contract: 0xAd338da8A2dDE5B5Fe08362c379c66D18Bb24151
Treasury Contract: 0x5aE2cf3fC0B99003C64bBDC7836D08064ED43Aab
DAOSettings Contract: 0x14daEbEDf316507ed450fecdA46B059E8037d367
```


## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Kaly Chain Team - [https://kalychain.io](https://kalychain.io)

Project Link: [https://github.com/KalyCoinProject/dao-contracts](https://github.com/KalyCoinProject/dao-contracts)
