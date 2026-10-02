import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda03ae58", function () {
  it("should transfer balance when block.number % 15 == 0, mutant with false never transfers", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to trigger fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Mine blocks until block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get balance before second call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Second call at block where block.number % 15 == 0
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original contract, balance should be transferred out (balanceAfter = 0)
    // In mutant, transfer never happens, so balanceAfter = balanceBefore + 10 ether
    expect(balanceAfter).to.equal(0);
  });
});