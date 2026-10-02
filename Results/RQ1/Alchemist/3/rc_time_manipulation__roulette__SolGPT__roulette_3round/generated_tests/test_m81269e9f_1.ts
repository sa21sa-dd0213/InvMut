import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m81269e9f", function () {
  it("should kill the mutant by detecting the missing +1 increment in pastBlockTime assignment", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tenEther = ethers.parseEther("10");

    // First call: send 10 ether to the contract
    const tx1 = await player.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });
    await tx1.wait();

    // Get the timestamp of the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const firstTimestamp = block1!.timestamp;

    // Mine a new block with timestamp = firstTimestamp + 1
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstTimestamp + 1]);
    
    // Second call: send another 10 ether in the next block with timestamp = firstTimestamp + 1
    const tx2 = player.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });

    // In the original contract, this second call should revert because 
    // pastBlockTime was set to firstTimestamp + 1, and now block.timestamp 
    // equals pastBlockTime (not greater than), so require fails.
    // In the mutant, pastBlockTime was set to firstTimestamp * 1 = firstTimestamp,
    // so block.timestamp (firstTimestamp + 1) > pastBlockTime, and the call succeeds.
    await expect(tx2).to.be.reverted;
  });
});