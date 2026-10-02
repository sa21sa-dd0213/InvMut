import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should kill mutant by sending two transactions in the same block (same timestamp)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial ether to allow transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First transaction: should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block with the same timestamp as the previous block
    // This ensures block.timestamp >= pastBlockTime (equal timestamps)
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest"))!.timestamp
    ]);
    await ethers.provider.send("evm_mine");

    // Second transaction at exactly the same timestamp
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original contract this should revert (require timestamp > pastBlockTime)
    // On mutant this should succeed (require timestamp >= pastBlockTime)
    // We expect revert to kill the mutant (mutant would pass, original reverts)
    await expect(tx2).to.be.reverted;
  });
});