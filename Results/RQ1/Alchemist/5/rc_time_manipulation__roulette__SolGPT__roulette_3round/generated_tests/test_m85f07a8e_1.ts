import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m85f07a8e test", function () {
  it("should detect the mutant by exploiting the time check bypass", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance (optional but realistic)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call - should succeed (sets pastBlockTime = block.timestamp - 1 in mutant)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx1.wait();

    // Second call - in original should revert due to time check
    // In mutant, pastBlockTime is now block.timestamp - 1, so condition passes
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    // If mutant is present, second call succeeds (no revert)
    // If original, second call reverts
    // We expect the second call to NOT revert in the mutant
    await expect(tx2.wait()).to.not.be.reverted;
  });
});