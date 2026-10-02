import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m85f07a8e test", function () {
  it("should revert when calling fallback twice in the same block (original behavior) but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx1.wait();

    // Second call in the same block - original reverts, mutant does not
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });

    // In the original, this should revert because pastBlockTime > block.timestamp
    // In the mutant (with timestamp - 1), it passes, so we expect revert
    await expect(tx2).to.be.reverted;
  });
});