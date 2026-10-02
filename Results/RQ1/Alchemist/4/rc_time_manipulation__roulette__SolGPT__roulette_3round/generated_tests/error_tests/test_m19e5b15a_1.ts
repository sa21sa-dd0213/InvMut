import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant detection - m19e5b15a", function () {
  it("should detect mutant that changes block.number to block.number-1 in the payout condition", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to the contract
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get the block number where the transaction was mined
    const block = await ethers.provider.getBlock(tx.blockNumber);
    const blockNumber = block.number;

    // If block.number % 15 == 0, the original would transfer balance, mutant would not
    if (blockNumber % 15 === 0) {
      // Check that balance was transferred to player in original
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      // The contract should have transferred its balance to the player
      // In original: player gets contract balance (10 ether)
      // In mutant: player gets nothing (contract still has 10 ether)
      // We can verify by checking if player balance increased by 10 ether
      expect(playerBalanceAfter).to.be.gt(ethers.parseEther("9999"));
    } else {
      // If block number is not multiple of 15, neither original nor mutant pays out
      // This test case is inconclusive - we need to ensure we hit a block % 15 == 0
      // For deterministic testing, we can mine blocks until condition is met
      while ((await ethers.provider.getBlock("latest")).number % 15 !== 0) {
        await ethers.provider.send("evm_mine");
      }
      // Now retry the test
      const tx2 = await player.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      });
      await tx2.wait();
      const block2 = await ethers.provider.getBlock(tx2.blockNumber);
      expect(block2.number % 15).to.equal(0);
      
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);
      expect(playerBalanceAfter).to.be.gt(ethers.parseEther("9999"));
    }
  });
});