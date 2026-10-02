import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m14ba9b32", function () {
  it("should detect mutant by verifying payout occurs at block.number % 15 == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate next multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach the target block where block.number % 15 == 0
    while (currentBlock < targetBlock - 1) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }

    // Get balance before the payout transaction
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send exactly 10 ether from addr1 at the target block
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after transaction
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // Original: payout should occur (balance decreases by 10 ether)
    // Mutant: no payout occurs (balance increases by 10 ether)
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});