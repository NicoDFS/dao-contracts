import { run, network } from "hardhat"

const verify = async (contractAddress: string, args: any[]) => {
  console.log(`Verifying contract on ${network.name}...`)
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
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
