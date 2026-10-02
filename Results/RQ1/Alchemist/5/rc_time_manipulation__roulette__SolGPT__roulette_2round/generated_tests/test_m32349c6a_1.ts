import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m32349c6a", function () {
  it("should kill mutant by triggering payout on block divisible by 15", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Mine blocks to reach a block number that is divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15)) % 15 + 1;
    
    // Mine blocks to reach the target
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get balance before call
    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    // User sends exactly 10 ETH to trigger fallback
    const tx = await user.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after call
    const balanceAfter = await ethers.provider.getBalance(contractAddress);

    // Verify the block number was divisible by 15
    const blockNum = await ethers.provider.getBlockNumber();
    expect(blockNum % 15).to.equal(0);

    // Original contract would transfer balance (balance decreases)
    // Mutant would NOT transfer (balance increases by 10 ETH)
    // So this assertion kills the mutant:
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});