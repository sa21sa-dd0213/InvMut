import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff test", function () {
  it("should kill mutant by showing payout on block % 15 == 0 in original but not in mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block number and calculate next block that is divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const nextTargetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach the target block number
    const blocksToMine = nextTargetBlock - currentBlock;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player's balance before sending ether
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Send exactly 10 ether to the contract via fallback function
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check player's balance after the transaction
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // In the original contract, the balance should have increased by ~10 ether (minus gas)
    // In the mutant, the condition block.number-1 % 15 == 0 will not trigger on block % 15 == 0
    // so the balance should have decreased by 10 ether (plus gas)
    // The mutant is killed if the player lost ether instead of gaining it
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});