import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection (m81269e9f)", function () {
  it("should detect mutant that changes + to * in pastBlockTime assignment", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First transaction: sets pastBlockTime to block.timestamp + 1 (original) or block.timestamp * 1 (mutant)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get the timestamp of the block where first transaction was mined
    const block1 = await ethers.provider.getBlock("latest");
    const firstTxTime = block1!.timestamp;

    // Wait exactly 1 second so the next transaction can happen at firstTxTime + 1
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstTxTime + 1]);

    // Second transaction at timestamp = firstTxTime + 1
    // Original requires block.timestamp > pastBlockTime (which is firstTxTime + 1) → reverts
    // Mutant requires block.timestamp > pastBlockTime (which is firstTxTime) → succeeds
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});