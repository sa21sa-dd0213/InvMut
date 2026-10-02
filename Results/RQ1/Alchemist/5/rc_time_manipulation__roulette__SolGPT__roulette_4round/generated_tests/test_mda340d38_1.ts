import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - kill mutant mda340d38 (condition always true)", function () {
  it("should NOT payout when block.number % 15 != 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance so we can check if payout occurs
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Ensure we are at a block where block.number % 15 != 0
    // We can mine blocks to control this
    while ((await ethers.provider.getBlock("latest")).number % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send exactly 10 ether from addr1 - this should NOT trigger payout in original
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check contract balance - should have increased by 10 ether (no payout)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance + ethers.parseEther("10"));
  });
});