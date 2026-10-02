import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m6d1f8efd - kill test", function () {
  it("should detect the % to / mutation by triggering the transfer at block number multiple of 15", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Get the current block number and mine blocks to reach a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToTarget = (15 - (currentBlock % 15)) % 15;
    
    // Mine blocks to reach a block number that is a multiple of 15
    for (let i = 0; i < blocksToTarget; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a block number that is a multiple of 15
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Send exactly 10 ether to trigger the fallback function
    const tx = await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // After the transfer, the contract balance should be 0
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // On the original, the transfer would happen (balance = 0)
    // On the mutant (block.number / 15 == 0), at block 15 or above, 15/15 = 1, so no transfer occurs (balance remains)
    expect(contractBalance).to.equal(0);
  });
});