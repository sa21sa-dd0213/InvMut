import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m4713b283 (transferFrom sender balance addition)", function () {
  it("should revert when transferFrom subtracts from sender balance (mutant adds instead)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract - no constructor arguments needed based on contract code
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: owner approves addr1 to spend tokens on their behalf
    // First need to give addr1 some allowance
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approveAmount);
    
    // Check initial balances (owner starts with totalDistributed tokens)
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialAddr2Balance = await instance.balanceOf(addr2.address);
    
    // Perform transferFrom: addr1 transfers from owner to addr2
    const transferAmount = ethers.parseEther("50");
    await instance.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
    
    // Check final balances
    const finalOwnerBalance = await instance.balanceOf(owner.address);
    const finalAddr2Balance = await instance.balanceOf(addr2.address);
    
    // Original: owner balance decreases by transferAmount
    // Mutant: owner balance increases by transferAmount (wrong)
    // Test should fail on mutant because owner balance will be higher than expected
    expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount);
    expect(finalAddr2Balance).to.equal(initialAddr2Balance + transferAmount);
    
    // Additional check: verify that the owner balance is actually less than before
    // This would kill the mutant where balance increases
    expect(finalOwnerBalance).to.be.lessThan(initialOwnerBalance);
  });
});