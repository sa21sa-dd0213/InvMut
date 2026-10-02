import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff test", function () {
  it("should kill the mutant by detecting that payout occurs only when block.number % 15 == 0, not block.number - 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Mine blocks to reach a block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = 15 - (currentBlock % 15);
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a block where block.number % 15 == 0
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Call fallback from addr1 with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that addr1 received the contract's balance (10 ether from previous funding)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.be.gt(initialBalance);
  });
});