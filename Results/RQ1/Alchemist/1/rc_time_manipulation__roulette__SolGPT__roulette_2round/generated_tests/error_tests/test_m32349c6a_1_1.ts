import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m32349c6a", function () {
  it("should send balance when block.number % 15 == 0, but mutant sends on != 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number and find next block that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + 1;
    // Ensure targetBlock is a multiple of 15
    while (targetBlock % 15 !== 0) {
      targetBlock++;
    }

    // Mine blocks to reach the target block number
    const blocksToMine = targetBlock - currentBlock;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player's balance before the call
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Send exactly 10 ether to the contract when block.number % 15 == 0
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Check that the player's balance increased by the full contract balance (10 ether)
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalance = await ethers.provider.getBalance(contractAddress);

    // In the original contract, the payout happens and contract balance becomes 0
    // In the mutant, the payout does NOT happen (condition is != 0), so contract still has 10 ether
    // We expect the player to receive the full 10 ether back (balance increases by 10)
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("10"));
    expect(contractBalance).to.equal(0);
  });
});