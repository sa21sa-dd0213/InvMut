import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m916b9143", function () {
  it("should kill mutant by showing that block.prevrandao does not enforce time-based cooldown", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call: should succeed (sets pastBlockTime to block.timestamp + 1)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine a new block to advance timestamp
    await ethers.provider.send("evm_mine", []);

    // Second call: in original, this would revert because block.timestamp < pastBlockTime
    // In mutant using block.prevrandao, this may NOT revert (prevrandao is random, not time-based)
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant should NOT revert, but the original would revert
    // If it does not revert, the mutant is killed (test passes)
    await expect(tx).to.not.be.reverted;
  });
});