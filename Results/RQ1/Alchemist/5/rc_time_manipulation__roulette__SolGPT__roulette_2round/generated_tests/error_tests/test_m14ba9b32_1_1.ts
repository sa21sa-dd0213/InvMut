import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 test", function () {
  it("should detect the mutant by verifying payout occurs when block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();
    
    // Get current block number and find next block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = 15 - (currentBlock % 15);
    const targetBlock = currentBlock + blocksToMine;
    
    // Mine blocks to reach the target block
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we're at the right block
    const verifiedBlock = await ethers.provider.getBlockNumber();
    expect(verifiedBlock % 15).to.equal(0);
    
    // Record player balance before
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Player sends exactly 10 ether to trigger the fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check player received the entire contract balance
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // The player should have received the contract balance (minus their 10 ether)
    expect(contractBalanceAfter).to.equal(0);
    expect(playerBalanceAfter - playerBalanceBefore).to.equal(contractBalanceBefore);
  });
});