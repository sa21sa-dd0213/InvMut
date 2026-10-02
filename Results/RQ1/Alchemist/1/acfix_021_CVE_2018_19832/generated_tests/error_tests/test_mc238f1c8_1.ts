import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - transferFrom division bug", function () {
  it("should detect the mutant where balances[_from] uses / instead of - in transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Owner transfers tokens to addr1 so addr1 has a balance
    // First call getTokens to distribute tokens to owner via the NETM function
    await instance.connect(owner).NETM();
    
    // Owner transfers 100 tokens to addr1
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Get addr1's balance before the transferFrom
    const balanceBefore = await instance.balanceOf(addr1.address);
    
    // Owner approves addr2 to spend 10 tokens from addr1
    const approveAmount = ethers.parseEther("10");
    await instance.connect(addr1).approve(addr2.address, approveAmount);
    
    // addr2 calls transferFrom to transfer 10 tokens from addr1 to addr2
    const transferFromAmount = ethers.parseEther("10");
    await instance.connect(addr2).transferFrom(addr1.address, addr2.address, transferFromAmount);
    
    // Get addr1's balance after the transferFrom
    const balanceAfter = await instance.balanceOf(addr1.address);
    
    // In the original contract: balanceAfter should equal balanceBefore - transferFromAmount
    // In the mutant: balanceAfter would equal balanceBefore / transferFromAmount (incorrect)
    const expectedBalance = balanceBefore - transferFromAmount;
    
    // This assertion will pass on the original but fail on the mutant
    expect(balanceAfter).to.equal(expectedBalance);
  });
});