import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test", function () {
  it("should detect the mutant by testing payout at block number exactly divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to the contract to enable the payout
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine blocks to reach a block number that is a multiple of 15 (e.g., block 15)
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    await ethers.provider.send("hardhat_mine", [ethers.toBeHex(targetBlock - currentBlock)]);

    // Now current block number is exactly divisible by 15
    // Get contract balance before second call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call fallback with another 10 ether and a later timestamp
    // First set pastBlockTime to a value in the past
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // After this call, the condition block.number / 15 == 0 would be false for block >= 15
    // The original would have transferred the balance; the mutant would not
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original, balance would be 0 because all funds were transferred out
    // In the mutant, balance would be > 0 because condition failed
    expect(balanceAfter).to.equal(0);
  });
});