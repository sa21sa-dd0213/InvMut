import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 detection", function () {
  it("should detect mutant by checking payout at block number divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: 0 });
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance so we can detect transfers
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await fundTx.wait();
    
    // Get the current block number and calculate the next block divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    
    // Mine blocks until we reach the target block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Record balances before the transaction
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly 10 ether from addr1 - this should trigger payout on original
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check balances after
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original: addr1 gets back the contract balance (which includes the initial 10 ether + their 10 ether = 20 ether)
    // In the mutant: addr1's 10 ether stays in the contract
    expect(balanceAfter).to.be.gt(balanceBefore);
    expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);
  });
});