import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - zero credit withdrawal", function () {
  it("should not allow withdrawal when credit is zero (kills mutant with >= instead of >)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has no credit (zero balance)
    // In original contract, withdrawAll() would skip the if block because 0 > 0 is false
    // In mutant, 0 >= 0 is true, so it attempts to send 0 ether and decrement balance
    
    // Get initial balance of contract and addr1
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);
    
    // addr1 calls withdrawAll with zero credit
    const tx = instance.connect(addr1).withdrawAll();
    
    // In the original, this would succeed silently (no state changes)
    // In the mutant, this should revert because it tries to decrement balance below zero
    // or send zero ether (depending on implementation details)
    await expect(tx).to.be.reverted;
    
    // Verify no state changes occurred
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
    
    expect(finalContractBalance).to.equal(initialContractBalance);
    expect(finalAddr1Balance).to.equal(initialAddr1Balance);
  });
});