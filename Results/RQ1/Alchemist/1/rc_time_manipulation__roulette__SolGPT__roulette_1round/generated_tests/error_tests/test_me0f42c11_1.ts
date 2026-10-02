import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - me0f42c11", function () {
  it("should NOT payout when block.number < 15 and not a multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to the contract to have a balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine blocks until we are at a block number between 1 and 14 (not a multiple of 15)
    // We'll target block number 10 for example
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1; // next block
    // Mine blocks to reach block number 10 (or ensure we are at a low block number)
    // For simplicity, we use a fixed block scenario by mining to block 10
    while (await ethers.provider.getBlockNumber() < 10) {
      await ethers.provider.send("evm_mine", []);
    }

    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call fallback from addr1 with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, block.number % 15 == 0 is false for block 10, so no payout
    // In the mutant, block.number / 15 == 0 is true for block 10, so payout would occur
    // We expect no transfer to addr1 (balance difference should be exactly 10 ether spent)
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10"));
    expect(balanceAfter).to.equal(balanceBefore - ethers.parseEther("10"));
  });
});