import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test for me0f42c11", function () {
  it("should detect the % to / mutation by verifying payout at block number divisible by 15", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger the fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get the block number where the transaction was mined
    const block = await ethers.provider.getBlock(tx.blockNumber);
    
    // Only test if the block number is divisible by 15 (original condition)
    // If not, we mine blocks until we reach a divisible block and try again
    if (block!.number % 15 !== 0) {
      // Mine blocks to reach the next block divisible by 15
      const blocksToMine = 15 - (block!.number % 15);
      for (let i = 0; i < blocksToMine; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Send another 10 ether at the correct block
      const tx2 = await player.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      });
      await tx2.wait();
      
      const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
      // If the mutation is present (division instead of modulo), 
      // the contract balance will NOT be transferred when block.number % 15 == 0
      // because block.number / 15 == 0 is false for blocks >= 15
      // So the contract should have 0 balance after payout
      expect(balanceAfter).to.equal(0);
    } else {
      // We happened to hit the right block, check balance
      const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
      expect(balanceAfter).to.equal(0);
    }
  });
});