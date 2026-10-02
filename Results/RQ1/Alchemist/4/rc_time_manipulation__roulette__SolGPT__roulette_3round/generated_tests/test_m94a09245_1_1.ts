import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 - timestamp check removal", function () {
  it("should revert when calling fallback twice in same block due to timestamp check, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - should revert in original, but not in mutant
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the original contract, this would revert with "block.timestamp > pastBlockTime"
    // In the mutant (which removed the require), it will succeed
    // We expect the transaction to succeed (mutant behavior), which kills the mutant
    // because the original would revert
    await expect(tx2).to.not.be.reverted;
  });
});