import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m32349c6a", function () {
  it("should transfer balance when block.number % 15 == 0 (original behavior), but mutant will NOT transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and find the next block divisible by 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const targetBlockNumber = currentBlockNumber + (15 - (currentBlockNumber % 15));

    // Mine blocks to reach the target block
    const blocksToMine = targetBlockNumber - currentBlockNumber - 1;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get balance before call
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call fallback from addr1 with 10 ether and wait for block to be divisible by 15
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx.wait();

    // Get balance after call
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // On original: balanceAfter should be ~10 ether more (transfer happens)
    // On mutant: balanceAfter should be ~10 ether less (no transfer, gas paid)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});