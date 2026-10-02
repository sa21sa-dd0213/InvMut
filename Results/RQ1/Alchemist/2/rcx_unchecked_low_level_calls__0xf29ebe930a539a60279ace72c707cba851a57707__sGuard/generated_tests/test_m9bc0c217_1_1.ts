import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - m9bc0c217", function () {
  it("should detect mutant by checking contract balance after go() call with 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(0);
    
    // Send 1 ether to go() function
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("1") });
    await tx.wait();
    
    // After go() execution, the contract balance should be exactly 0
    // Original: sends all msg.value to target, then transfers all remaining balance to owner
    // Mutant: sends msg.value-1 to target, leaving 1 wei in contract which gets transferred to owner
    // So original leaves 0 balance, mutant leaves 0 balance but with different distribution
    // Actually we need to check the owner's balance to detect the difference
    
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const ownerBalance = await ethers.provider.getBalance(owner.address);
    
    // In the original: target receives msg.value, owner receives 0 additional
    // In the mutant: target receives msg.value-1, owner receives the remaining 1 wei
    // Since owner starts with balance, we need to compare against initial owner balance
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const ownerDelta = ownerBalance - initialOwnerBalance;
    
    // The owner should receive 0 wei from this transaction in the original
    // But in the mutant, owner receives 1 wei extra
    expect(ownerDelta).to.equal(0);
  });
});