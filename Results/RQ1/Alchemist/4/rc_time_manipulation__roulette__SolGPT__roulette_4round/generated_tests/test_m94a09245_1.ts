import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m94a09245", function () {
  it("should revert when calling fallback twice in the same block", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx1.wait();

    // Second call in the same block should revert on original contract
    // but succeed on mutant (mutant removes the timestamp check)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.be.reverted;
  });
});