import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda03ae58 test", function () {
  it("should kill mutant by verifying payout when block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance (optional, for clarity)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Get current block number and calculate target block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    
    // Get player's balance before the payout
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Send 10 ether to trigger fallback at a block where condition would be true
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      // Mine at the target block
      gasLimit: 100000
    });
    
    // Mine blocks until we reach targetBlock
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Send another 10 ether at the target block to trigger fallback with condition true
    const tx2 = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx2.wait();
    
    // Check player's balance after - on original it should increase, on mutant it should not
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const balanceDiff = balanceAfter - balanceBefore;
    
    // On original contract, player should receive the contract balance (at least 20 ether)
    // On mutant, condition is false so no transfer happens - player balance decreases by 10 ether (gas costs)
    expect(balanceDiff).to.be.gt(ethers.parseEther("19")); // Kills mutant because mutant never pays out
  });
});