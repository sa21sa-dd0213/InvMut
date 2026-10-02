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

    // Mine a new block with the same timestamp as the previous one
    // to make block.timestamp == pastBlockTime (which is pastBlockTime - 1)
    // We need to force the next block to have the same timestamp
    const blockBefore = await ethers.provider.getBlock("latest");
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