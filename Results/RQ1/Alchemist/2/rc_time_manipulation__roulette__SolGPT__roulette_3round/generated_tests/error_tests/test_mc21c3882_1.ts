import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should kill mutant by exploiting >= instead of > for timestamp check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: succeeds in both original and mutant
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Second call in the same block (same timestamp)
    // Original reverts because block.timestamp == pastBlockTime (not >)
    // Mutant succeeds because block.timestamp >= pastBlockTime
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant will NOT revert, so we expect this to NOT be reverted
    // (If it reverts, the mutant is killed because original would revert too)
    await expect(tx).to.not.be.reverted;
  });
});