import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m916b9143", function () {
  it("should kill the mutant by proving block.prevrandao is not monotonic like block.timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First valid call - should succeed on both original and mutant
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine a new block to ensure block.prevrandao could be <= previous
    // We'll simulate by sending a second transaction in the same block
    // (mining two transactions in same block means block.prevrandao is identical)
    await ethers.provider.send("evm_mine", []);

    // Get the current pastBlockTime (which stores the previous block.prevrandao in mutant)
    const prevValue = await instance.pastBlockTime();

    // Second call - in mutant, require(block.prevrandao > pastBlockTime) may fail
    // because block.prevrandao can be less than or equal to the previous value
    // We'll send two transactions quickly to increase chance of non-increasing prevrandao
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine another block to change prevrandao
    await ethers.provider.send("evm_mine", []);

    // Third call - if mutant, block.prevrandao might be lower than stored pastBlockTime
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In the mutant, this transaction may revert if block.prevrandao <= pastBlockTime
    // In the original, it would always succeed as long as timestamp increases
    // We expect it to revert in mutant, proving the bug
    await expect(tx2).to.be.reverted;
  });
});