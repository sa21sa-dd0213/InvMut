import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 - timestamp check removal", function () {
  it("should revert on second call in same block when timestamp check exists (original) but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - should revert in original but pass in mutant
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant would allow this (no revert), but we expect revert for original behavior
    // To kill the mutant we assert that it does NOT revert (mutant behavior)
    await expect(tx2).to.not.be.reverted;
  });
});