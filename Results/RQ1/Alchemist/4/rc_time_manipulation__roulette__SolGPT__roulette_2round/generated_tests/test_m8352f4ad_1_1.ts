import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m8352f4ad", function () {
  it("should kill mutant by verifying payout at block number divisible by 15", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Record player's balance before the call
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Send 10 ether to the contract at a block number that is a multiple of 15
    // We need to mine blocks until we reach a block number where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlock("latest");
    let blockNumber = currentBlock.number;
    const blocksToMine = (15 - (blockNumber % 15)) % 15;

    // Mine blocks to reach the target block number
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at the right block
    currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock.number % 15).to.equal(0);

    // Send transaction from player
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check player's balance after the call
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // The player should have received the entire contract balance (which was 10 ether)
    // minus gas costs, so balanceAfter should be significantly more than balanceBefore - 10 ether
    // On the mutant, the player will NOT receive the payout, so balanceAfter will be balanceBefore - 10 ether - gas
    const expectedMinimum = balanceBefore - ethers.parseEther("10");
    expect(balanceAfter).to.be.gt(expectedMinimum);
  });
});