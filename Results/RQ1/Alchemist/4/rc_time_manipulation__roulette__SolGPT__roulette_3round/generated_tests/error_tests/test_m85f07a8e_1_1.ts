import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m85f07a8e test", function () {
  it("should kill the mutant by proving the time lock bypass", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed in both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call immediately after (same block or same second)
    // In the original contract, this should revert due to time lock
    // In the mutant (timestamp - 1), it will succeed, thus killing the mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});