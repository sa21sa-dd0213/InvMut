import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - division vs modulo", function () {
  it("should detect mutant that replaces % with / by sending 10 ether at block.number < 15 and verifying no transfer occurs", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();
    
    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    
    // Get current block number and calculate a block where block.number / 15 == 0
    // (i.e., block.number < 15) but block.number % 15 != 0
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // We need to mine blocks to reach a block where block.number < 15
    // If we're past block 14, we need to deploy in a fresh environment
    // For this test, we'll mine to block 10
    while (await ethers.provider.getBlockNumber() < 10) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Get initial balance of attacker
    const initialBalance = await ethers.provider.getBalance(attacker.address);
    
    // Get initial contract balance
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    
    // Now send exactly 10 ether to trigger the fallback
    // At block.number = 10 (or any block < 15):
    // Original: block.number % 15 = 10 != 0 => no transfer
    // Mutant: block.number / 15 = 0 => condition is true => transfer occurs
    
    const tx = await attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check final contract balance
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);
    
    // In the original contract, no transfer should happen, so contract balance increases by 10
    // In the mutant, transfer happens, so contract balance decreases (or stays same)
    expect(finalContractBalance).to.equal(initialContractBalance + ethers.parseEther("10"));
    
    // Verify attacker balance decreased by exactly 10 (gas costs aside)
    const finalBalance = await ethers.provider.getBalance(attacker.address);
    // We check that attacker didn't receive any transfer back (they only paid gas + 10 ether)
    expect(finalBalance).to.be.lessThan(initialBalance - ethers.parseEther("10"));
  });
});