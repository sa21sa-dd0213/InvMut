import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test (me0f42c11)", function () {
  it("should detect the mutant by checking transfer when block.number >= 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Get current block number and mine blocks to reach block.number >= 15
    let currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = 15;

    // Mine blocks until we reach block number 15
    while (currentBlock < targetBlock) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }

    // Now block.number >= 15, so in the original contract,
    // block.number % 15 could be 0, but block.number / 15 != 0
    // We need block.number to be exactly 15 so that 15 % 15 == 0 (original)
    // but 15 / 15 == 1 != 0 (mutant)
    // Ensure we are at block 15
    while (currentBlock < 15) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send 10 ether to trigger the fallback function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Get final balance of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // In the original contract, since block.number % 15 == 0, the transfer would occur
    // In the mutant, block.number / 15 == 1, so no transfer occurs
    // The mutant is killed if the balance does NOT increase (transfer didn't happen)
    expect(finalBalance).to.equal(initialBalance);
  });
});