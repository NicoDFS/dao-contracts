import { run, network } from "hardhat"

const verify = async (contractAddress: string, args: any[], contract?: string) => {
  console.log(`Verifying contract on ${network.name}...`)
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
      contract: contract,
    })
    console.log("Verification successful!")
  } catch (e: any) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already verified!")
    } else {
      console.log("Verification failed:")
      console.log(e)
    }
  }
}

export default verify
