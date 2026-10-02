import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m916b9143 test", function () {
  it("should kill mutant by exploiting block.prevrandao vs block.timestamp difference", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Send first transaction to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block so block.timestamp increases but block.prevrandao stays the same
    await ethers.provider.send("evm_mine", []);

    // Get the current block's prevrandao and timestamp for debugging (optional)
    const block = await ethers.provider.getBlock("latest");
    
    // Send second transaction - should succeed in original (timestamp > pastBlockTime)
    // but should revert in mutant because prevrandao may not be > pastBlockTime
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In mutant this should revert because block.prevrandao is not guaranteed to be
    // greater than the previously stored pastBlockTime (which was set to a timestamp)
    await expect(tx2).to.be.reverted;
  });
});