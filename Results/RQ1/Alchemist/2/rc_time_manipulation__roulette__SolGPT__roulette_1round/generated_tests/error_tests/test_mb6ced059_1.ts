import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test", function () {
  it("should kill mutant mb6ced059 by sending 10 ether and expecting success, which will revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Wait for a block where block.number % 15 != 0 to avoid payout
    let blockNumber = await ethers.provider.getBlockNumber();
    while (blockNumber % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      blockNumber = await ethers.provider.getBlockNumber();
    }

    // Send exactly 10 ether - should succeed on original, revert on mutant
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx.wait()).to.be.fulfilled;

    // Verify state changed (pastBlockTime updated)
    const pastBlockTime = await instance.pastBlockTime();
    expect(pastBlockTime).to.be.gt(0);
  });
});