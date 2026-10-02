import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m32349c6a", function () {
  it("should kill mutant by verifying payout does NOT occur when block.number % 15 == 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Fund the contract with 10 ether for the test
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // We need to trigger the fallback when block.number % 15 == 0
    // Mine blocks until we reach a block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15)) % 15;

    // Mine to the target block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now call fallback with exactly 10 ether when block.number % 15 == 0
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Original: pays out when block.number % 15 == 0, so balance should decrease
    // Mutant: pays out when block.number % 15 != 0, so balance should INCREASE (no payout)
    // If mutant is live, finalBalance > initialBalance (no payout occurred)
    // If original, finalBalance < initialBalance (payout occurred)
    // This test will fail on mutant because we expect the balance to decrease (original behavior)
    expect(finalBalance).to.be.lessThan(initialBalance);
  });
});