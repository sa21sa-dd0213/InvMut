import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda03ae58", function () {
  it("should detect mutant where payout condition is replaced with false", async function () {
    const [owner, caller] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block number and calculate the next block divisible by 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Send 10 ether to the contract
    const tx = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx.wait();

    // Mine blocks until we reach the target block number
    while (await ethers.provider.getBlockNumber() < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get contract balance before second call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send another 10 ether at the target block number
    const tx2 = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx2.wait();

    // Get contract balance after second call
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original contract, the entire balance would be transferred to caller
    // In the mutant, the condition is false so balance remains unchanged
    // Since we sent 10 ether and there was already 10 ether, total should be 20 ether if payout didn't happen
    // But if payout happened, balance should be close to 0 (minus gas)
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
  });
});