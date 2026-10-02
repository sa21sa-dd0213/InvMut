import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant m916b9143 test", function () {
  it("should kill mutant by exploiting block.prevrandao not being monotonically increasing", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call: set pastBlockTime to current timestamp + 1
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to advance block.number and block.timestamp
    await ethers.provider.send("evm_mine", []);

    // In the original, block.timestamp > pastBlockTime would always be true after mining.
    // In the mutant, block.prevrandao might be less than or equal to pastBlockTime.
    // This second call should revert in the mutant if block.prevrandao <= pastBlockTime,
    // but pass in the original. We expect it to revert, killing the mutant.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});