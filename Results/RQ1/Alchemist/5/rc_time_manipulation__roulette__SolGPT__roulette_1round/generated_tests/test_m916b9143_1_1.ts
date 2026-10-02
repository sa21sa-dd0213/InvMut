import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m916b9143", function () {
  it("should kill the mutant by sending two consecutive transactions in different blocks where the second succeeds on original but fails on mutant due to block.prevrandao comparison", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First transaction: send exactly 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to ensure block.timestamp changes in original
    await ethers.provider.send("evm_mine", []);

    // Get the stored pastBlockTime after first transaction
    const pastBlockTime = await instance.pastBlockTime();

    // Mine additional blocks until we find a block where block.prevrandao <= pastBlockTime
    let found = false;
    let attempts = 0;
    while (!found && attempts < 100) {
      // Get current block's prevrandao
      const block = await ethers.provider.getBlock("latest");
      const prevrandao = block?.prevrandao || BigInt(0);
      
      if (prevrandao <= pastBlockTime) {
        found = true;
        // This block should cause the second transaction to revert in the mutant
        // but succeed in the original (since timestamp increased)
        await expect(
          owner.sendTransaction({
            to: await instance.getAddress(),
            value: ethers.parseEther("10")
          })
        ).to.be.reverted;
      } else {
        // Mine another block and try again
        await ethers.provider.send("evm_mine", []);
        attempts++;
      }
    }

    if (!found) {
      // Force a block with prevrandao = 0 to trigger the mutant condition
      await ethers.provider.send("hardhat_setPrevRandao", ["0x0"]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        owner.sendTransaction({
          to: await instance.getAddress(),
          value: ethers.parseEther("10")
        })
      ).to.be.reverted;
    }
  });
});