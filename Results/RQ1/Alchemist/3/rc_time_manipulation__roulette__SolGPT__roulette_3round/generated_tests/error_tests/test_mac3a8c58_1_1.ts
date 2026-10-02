import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mac3a8c58", function () {
  it("should detect mutant that changes == to != in block.number % 15 condition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the contract with 10 ether to satisfy the constructor payable requirement
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Get the current block number and calculate a block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock;
    while (targetBlock % 15 !== 0) {
      targetBlock++;
    }

    // Mine blocks until we reach the target block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record the contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(instance.target);

    // Call the fallback with exactly 10 ether
    const tx = await user.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10"),
      gasLimit: 1000000
    });
    await tx.wait();

    // Check the contract balance after the call
    const balanceAfter = await ethers.provider.getBalance(instance.target);

    // In the original contract, when block.number % 15 == 0, the balance is transferred to msg.sender
    // In the mutant (with !=), the balance is NOT transferred, so the balance should increase by 10 ether
    // This assertion will fail on the original (which transfers), but pass on the mutant (which doesn't transfer)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});