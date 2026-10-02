import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - md3aae15f", function () {
  it("should detect the mutant that changes > to < in timestamp check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First transaction: set pastBlockTime to current block timestamp + 1
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the stored pastBlockTime after first transaction
    const storedTime = await instance.pastBlockTime();
    
    // Mine a new block to advance time
    await ethers.provider.send("evm_mine", []);

    // Second transaction: should succeed on original (> check) but fail on mutant (< check)
    // because current timestamp is now greater than storedTime
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original: succeeds (block.timestamp > pastBlockTime)
    // On mutant: reverts (block.timestamp < pastBlockTime is false)
    await expect(tx2).to.be.reverted;
  });
});