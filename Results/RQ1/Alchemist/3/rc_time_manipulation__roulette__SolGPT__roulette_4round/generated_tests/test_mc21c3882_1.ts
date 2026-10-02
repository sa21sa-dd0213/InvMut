import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should kill mutant by making two calls in the same timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block with the same timestamp (force timestamp to stay the same)
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp
    ]);

    // Second call at exactly the same timestamp
    // Original reverts (strict >), mutant passes (>=)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant will not revert, so we expect the original behavior to revert
    // This assertion will pass for the original but fail (kill) the mutant
    await expect(tx2).to.be.reverted;
  });
});