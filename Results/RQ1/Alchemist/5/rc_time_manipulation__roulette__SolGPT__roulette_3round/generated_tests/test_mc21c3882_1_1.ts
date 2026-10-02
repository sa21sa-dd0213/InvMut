import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 detection", function () {
  it("should revert when block.timestamp equals pastBlockTime (original strict >)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to set pastBlockTime to block.timestamp + 1
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });

    // Get the current block timestamp
    const blockBefore = await ethers.provider.getBlock("latest");
    
    // Set next block timestamp to be the same as current block timestamp
    // This will make block.timestamp == pastBlockTime (which is block.timestamp + 1 - 1 = block.timestamp)
    await ethers.provider.send("evm_setNextBlockTimestamp", [blockBefore!.timestamp]);

    // This transaction should revert on original (strict >) but succeed on mutant (>=)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.be.reverted;
  });
});