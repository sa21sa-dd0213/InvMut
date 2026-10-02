import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should kill mutant by verifying payout at block.number % 15 == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Advance to a block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    
    // Mine blocks to reach the target
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a block where block.number % 15 == 0
    const blockNum = await ethers.provider.getBlockNumber();
    expect(blockNum % 15).to.equal(0);

    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send exactly 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get final balance of addr1
    const finalBalance = await ethers.provider.getBalance(addr1.address);

    // In original: payout should occur, addr1 receives contract balance
    // In mutant: payout only at block.number == 1, so no payout here
    // If mutant, finalBalance == initialBalance (no transfer)
    // If original, finalBalance > initialBalance (transfer happened)
    expect(finalBalance).to.be.gt(initialBalance);
  });
});