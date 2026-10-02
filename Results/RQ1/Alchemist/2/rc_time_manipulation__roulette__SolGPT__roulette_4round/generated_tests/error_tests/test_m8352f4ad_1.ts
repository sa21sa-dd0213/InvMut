import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill m8352f4ad", function () {
  it("should transfer balance to caller when block.number % 15 == 0, but mutant never transfers", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance (e.g., 10 ether from owner)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record player's balance before
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Find a block number that is divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    
    // Mine blocks until we reach a block where block.number % 15 == 0
    await ethers.provider.send("hardhat_mine", [(targetBlock - currentBlock).toString()]);

    // Player sends 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check player's balance after
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // On original: player gets contract balance (10 + 10 = 20 ether) back, so balance increases
    // On mutant: no transfer happens, so balance decreases by exactly 10 ether (gas costs ignored)
    const netChange = playerBalanceAfter - playerBalanceBefore;
    
    // Mutant fails because no transfer occurred - player's net change is negative (only paid gas)
    // Original passes because player received the contract balance
    expect(netChange).to.be.gt(ethers.parseEther("9")); // Should be ~+20 ether on original
  });
});