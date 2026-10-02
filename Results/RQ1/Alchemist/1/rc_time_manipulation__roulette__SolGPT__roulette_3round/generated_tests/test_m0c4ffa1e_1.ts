import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill m0c4ffa1e", function () {
  it("should NOT payout when block.number % 15 != 0, but mutant pays on every call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number to ensure we call in a block where % 15 != 0
    let currentBlock = await ethers.provider.getBlockNumber();
    // If current block % 15 == 0, mine one more block to avoid the condition
    if (currentBlock % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call fallback with exactly 10 ether from addr1
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get contract balance after the call
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // Original contract would keep balance (no payout), mutant would drain it to zero
    // Expect balance to remain unchanged (original behavior) - this will fail on mutant
    expect(balanceAfter).to.equal(balanceBefore);
  });
});