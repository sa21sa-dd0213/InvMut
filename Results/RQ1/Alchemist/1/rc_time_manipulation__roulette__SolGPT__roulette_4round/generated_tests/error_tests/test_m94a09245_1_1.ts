import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test", function () {
  it("should kill mutant m94a09245 by calling fallback twice in the same block", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;

    // Mine both transactions in the same block by setting the same timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);

    const tx1_sameBlock = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1_sameBlock.wait();

    // Now try second call with same timestamp - should revert on original
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);

    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // Original reverts; mutant would NOT revert -> test passes on original, fails on mutant
  });
});