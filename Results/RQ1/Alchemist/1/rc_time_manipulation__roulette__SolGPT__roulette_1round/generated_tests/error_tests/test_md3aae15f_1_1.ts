import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - md3aae15f", function () {
  it("should revert on second call when timestamp is greater than pastBlockTime (mutant uses <)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block timestamp after first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const pastBlockTime = block1!.timestamp;

    // Wait for a new block with a greater timestamp
    await ethers.provider.send("evm_increaseTime", [2]); // increase by 2 seconds
    await ethers.provider.send("evm_mine", []); // mine a new block

    // Second call: should revert in mutant (requires block.timestamp < pastBlockTime)
    // but pass in original (requires block.timestamp > pastBlockTime)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});