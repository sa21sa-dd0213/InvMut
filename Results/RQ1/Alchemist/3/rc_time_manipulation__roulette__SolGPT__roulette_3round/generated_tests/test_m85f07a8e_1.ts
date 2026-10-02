import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m85f07a8e test", function () {
  it("should revert on second consecutive call within same second (original behavior) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to trigger the fallback function
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx1.wait();

    // Attempt a second call with the same timestamp (by mining a block with the same timestamp)
    // In Hardhat, we can mine a block with a specific timestamp
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    
    // Mine a new block with the same timestamp (simulating same second)
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    
    // Try second call - should revert on original, succeed on mutant
    const tx2 = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });

    // The original contract reverts because block.timestamp <= pastBlockTime (which is currentTimestamp + 1)
    // The mutant sets pastBlockTime = currentTimestamp - 1, so block.timestamp (currentTimestamp) > currentTimestamp - 1 is true
    // Therefore the mutant does NOT revert, but the original does
    await expect(tx2).to.be.reverted;
  });
});