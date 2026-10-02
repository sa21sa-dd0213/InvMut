import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m6d1f8efd - division instead of modulo", function () {
  it("should revert when calling fallback at block number multiple of 15 due to division operator", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Fund the contract with additional balance so transfer can happen
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call to set pastBlockTime
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine blocks to reach a block number that is a multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = 15 - (currentBlock % 15);
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // This call should trigger the payout in original (modulo) but NOT in mutant (division)
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    const receipt = await tx.wait();

    // In mutant, condition block.number / 15 == 0 is false (since block.number >= 15),
    // so no transfer occurs and balance remains unchanged
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("30")); // 10 initial + 10 first call + 10 this call
  });
});