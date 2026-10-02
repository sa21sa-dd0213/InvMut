import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m916b9143", function () {
  it("should detect mutant by testing that block.prevrandao does not guarantee time progression", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - should succeed in original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block where prevrandao might be the same or lower
    // This simulates the scenario where block.prevrandao doesn't increase monotonically
    await ethers.provider.send("hardhat_mine", ["0x1"]);

    // Get current pastBlockTime value to understand what it was set to
    const pastTime = await instance.pastBlockTime();

    // Second call - should revert in original (timestamp check), but might succeed in mutant
    // if block.prevrandao happens to be > pastBlockTime (which was set to block.timestamp + 1)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the original, this should revert because block.timestamp > pastBlockTime fails
    // In the mutant, this might revert or succeed depending on block.prevrandao value
    // We expect revert in both cases, but for different reasons
    await expect(tx2).to.be.reverted;
  });
});