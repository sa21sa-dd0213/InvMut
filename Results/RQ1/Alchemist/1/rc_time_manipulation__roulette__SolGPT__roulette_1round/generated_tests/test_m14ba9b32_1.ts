import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 test", function () {
  it("should detect mutant by checking no payout when block.number % 15 == 14", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate a target block where block.number % 15 == 14
    let currentBlock = await ethers.provider.getBlockNumber();
    let blocksToMine = (14 - (currentBlock % 15) + 15) % 15;
    
    // Mine blocks to reach the desired block number
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at block where block.number % 15 == 14
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(14);

    // Record balance before call
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call fallback from addr1 with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that addr1 did NOT receive any ether (mutant would incorrectly pay out)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    // Balance should have decreased by 10 ether (gas costs) with no payout
    expect(balanceAfter).to.be.lessThan(balanceBefore - ethers.parseEther("9.99"));
  });
});