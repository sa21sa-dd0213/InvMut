import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m257374c1", function () {
  it("should NOT transfer balance when block.number is not a multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await fundTx.wait();

    // Mine blocks until block.number % 15 != 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1; // ensure we're on a block where block.number % 15 != 0
    while ((await ethers.provider.getBlockNumber()) % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send exactly 10 ether to trigger the fallback
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Use addr1 to call fallback with 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // Original: should not transfer because block.number % 15 != 0
    // Mutant: would transfer because condition always true
    expect(balanceAfter).to.equal(balanceBefore);
  });
});