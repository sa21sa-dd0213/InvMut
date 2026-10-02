import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - me0f42c11", function () {
  it("should kill mutant that replaces % with / by checking payout at block number multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether first (constructor is payable)
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();

    // Mine blocks to reach a block where block.number % 15 == 0
    // We need to ensure we are at a block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Send 10 ether from addr1 to trigger fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original, the payout should occur (balance increases by ~10 ether minus gas)
    // In the mutant (block.number / 15 == 0), for any block >= 15 the condition is false, so no payout
    // Since we mined to a block >= 15 that is a multiple of 15, mutant will NOT pay
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});