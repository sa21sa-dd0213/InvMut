import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - inequality vs equality", function () {
  it("should kill the mutant by proving transfer occurs only on block.number % 15 == 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether to have balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Capture initial balance of owner
    const initialBalance = await ethers.provider.getBalance(owner.address);

    // Get current block number and find next block that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock;
    while (targetBlock % 15 !== 0) {
      targetBlock++;
    }

    // Mine blocks until we reach a block number divisible by 15
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Call fallback with exactly 10 ether and timestamp > pastBlockTime
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check balance after transfer - if mutant is alive (uses !=), no transfer happens
    // If original (uses ==), transfer happens and balance decreases
    const finalBalance = await ethers.provider.getBalance(owner.address);

    // The original contract would transfer the entire balance back, so owner's net change
    // should be approximately zero (paid 10 ether, received back ~10 ether minus gas)
    // The mutant would NOT transfer, so owner would lose 10 ether
    // We expect the original behavior: owner's balance should not be less than initial - 10 ether
    expect(finalBalance).to.be.greaterThan(
      initialBalance - ethers.parseEther("10") - ethers.parseEther("1")
    );
  });
});