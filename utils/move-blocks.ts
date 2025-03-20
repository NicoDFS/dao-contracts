import { network } from "hardhat"

// Check if in CI environment
const isCI = process.env.CI === "true"

export async function moveBlocks(amount: number) {
  console.log("Moving blocks...")
  // In CI, reduce the number of blocks to move to speed up tests
  const actualAmount = isCI ? Math.max(1, Math.floor(amount * 0.1)) : amount
  
  if (isCI) {
    console.log(`CI detected: Reducing blocks from ${amount} to ${actualAmount}`)
  }
  
  for (let index = 0; index < actualAmount; index++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    })
  }
  console.log(`Moved ${actualAmount} blocks`)
}
