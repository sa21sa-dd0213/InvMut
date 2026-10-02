import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 - timestamp check removal", function () {
  it("should revert when calling fallback twice in the same block due to timestamp check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Fund the contract with enough balance for potential transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 1000000
    });
    await tx1.wait();

    // Second call in the same block (same timestamp) should revert on original
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
        gasLimit: 1000000
      })
    ).to.be.reverted;
  });
});