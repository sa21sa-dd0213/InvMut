import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant me0f42c11 - division instead of modulo", function () {
  it("should kill the mutant by sending 10 ether at a block number >= 15 that is not a multiple of 15", async function () {
    const [owner, sender] = await ethers.getSigners();
    
    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: 0 });
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance so transfer can succeed
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx.wait();
    
    // Get the current block number and advance to a block >= 15 that is NOT a multiple of 15
    // We'll use block number 16 as an example (>=15 and 16/15=1, not 0)
    // In Hardhat we can mine to a specific block
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp + 100
    ]);
    await ethers.provider.send("evm_mine");
    
    // Ensure we are at block number >= 15
    let blockNum = await ethers.provider.getBlockNumber();
    while (blockNum < 15) {
      await ethers.provider.send("evm_mine", []);
      blockNum = await ethers.provider.getBlockNumber();
    }
    
    // If blockNum is exactly 15, mine one more to get 16
    if (blockNum === 15) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we're at a block where original condition would be false (not multiple of 15)
    // but mutant condition would be false too (since block.number / 15 != 0 for block >= 15)
    // The key: the original would transfer at multiples of 15, mutant only at blocks 0-14
    // We'll test that at block 16, the transfer does NOT happen (mutant fails to transfer)
    
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    
    // Send 10 ether to trigger fallback
    const tx = await sender.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx.wait();
    
    // After the transaction, check contract balance
    const contractBalanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    
    // In the original contract at block 16 (not multiple of 15), no transfer would occur
    // so balance would increase by 10 ether
    // In the mutant, also no transfer occurs (block/15 != 0), so balance also increases
    // To kill the mutant, we need a different scenario - let's test at block 0-14
    
    // Actually, let's restart and test at block 0 where the mutant WOULD transfer incorrectly
    // Deploy a fresh contract
    const instance2 = await Factory.deploy({ value: 0 });
    await instance2.waitForDeployment();
    
    // Fund it
    const fundTx2 = await owner.sendTransaction({
      to: await instance2.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx2.wait();
    
    // Mine to block 0 (genesis is block 0, so we should be there already after deploy)
    // But deploy creates a block, so let's check
    const deployBlock = await ethers.provider.getBlockNumber();
    
    // If we're not at block 0, reset and deploy at block 0
    if (deployBlock !== 0) {
      // Reset to a fresh chain state
      await ethers.provider.send("hardhat_reset", []);
    }
    
    // Redeploy at block 0
    const instance3 = await Factory.deploy({ value: 0 });
    await instance3.waitForDeployment();
    
    const fundTx3 = await owner.sendTransaction({
      to: await instance3.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx3.wait();
    
    // Now at block 0, both original and mutant would trigger (0%15==0 and 0/15==0)
    // But at block 1: original: 1%15!=0 -> no transfer; mutant: 1/15==0 -> transfer!
    // This is the killing test
    
    // Mine to block 1
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp + 100
    ]);
    await ethers.provider.send("evm_mine");
    
    const balanceBefore = await ethers.provider.getBalance(
      await instance3.getAddress()
    );
    
    // Send 10 ether at block 1
    const tx2 = await sender.sendTransaction({
      to: await instance3.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx2.wait();
    
    const balanceAfter = await ethers.provider.getBalance(
      await instance3.getAddress()
    );
    
    // Original: 1%15 != 0, so no transfer -> balance increases by 10
    // Mutant: 1/15 == 0, so transfer happens -> balance decreases by ~10 (minus 1 initial)
    // The mutant would send the entire balance (initial 1 + 10 = 11) to sender
    // So balanceAfter should be close to 0 in mutant, but ~11 in original
    
    // Assert that balance increased (original behavior)
    // If mutant, balance would be ~0 and this assertion fails -> test kills mutant
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});