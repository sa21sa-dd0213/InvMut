import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mc21c3882", function () {
  it("should detect mutant that changes > to >= by sending two calls in same block timestamp", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 10 ether first (constructor is payable but we didn't send any)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestamp = blockBefore!.timestamp;

    // Mine a block with a specific timestamp (same as current)
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine", []);

    // First call - should succeed in both original and mutant
    const tx1 = await attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in same block (timestamp hasn't changed)
    // Original: require(block.timestamp > pastBlockTime) -> fails (timestamp == pastBlockTime)
    // Mutant: require(block.timestamp >= pastBlockTime) -> succeeds
    const tx2 = attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // In original contract, this would revert; in mutant it succeeds
    // We expect the transaction to revert if the contract is the original
    await expect(tx2).to.be.reverted;
  });
});