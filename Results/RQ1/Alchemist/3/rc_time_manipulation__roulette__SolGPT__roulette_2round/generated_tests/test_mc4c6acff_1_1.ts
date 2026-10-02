import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff test", function () {
  it("should detect mutant by testing payout at block number multiple of 15", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("20")
    });

    // Get current block number
    let currentBlock = await ethers.provider.getBlockNumber();
    
    // Calculate blocks needed to reach next block that is multiple of 15
    const blocksToAdd = (15 - (currentBlock % 15)) % 15;
    
    // Mine blocks to reach the target block number (multiple of 15)
    for (let i = 0; i < blocksToAdd; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get player's balance before transaction
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    // Player sends exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get player's balance after transaction
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const balanceDifference = playerBalanceAfter - playerBalanceBefore;
    
    // In the original contract, player should receive the contract balance (approx 20 ether)
    // In the mutant (block.number-1 % 15 == 0), this condition only triggers at block 1
    // Since we're at a much later block, the mutant will NOT transfer funds
    // So the balance difference should be approximately -10 ether (only lost gas)
    // But original would show balance increase of approximately +10 ether (received ~20, sent 10)
    
    // The test passes if the player's balance changed (meaning payout happened)
    // and fails if balance only decreased (meaning no payout, mutant behavior)
    expect(balanceDifference).to.be.gt(ethers.parseEther("5"));
  });
});