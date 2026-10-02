import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant mbf8b57f6 (transferFrom allowance check inversion)", function () {
  it("should revert when spender tries to transfer amount less than allowance on mutant", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, initialize the contract by calling NETM() to set owner balance
    await instance.connect(owner).NETM();
    
    // Transfer some tokens to spender so they have balance to approve
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(spender.address, transferAmount);
    
    // Spender approves owner to spend tokens
    const approveAmount = ethers.parseEther("50");
    await instance.connect(spender).approve(owner.address, approveAmount);
    
    // Owner tries to transfer 30 tokens (less than the 50 approved)
    // Original: should succeed (30 <= 50)
    // Mutant: should revert (30 >= 50 is false)
    const transferToRecipient = ethers.parseEther("30");
    await expect(
      instance.connect(owner).transferFrom(
        spender.address,
        recipient.address,
        transferToRecipient
      )
    ).to.be.reverted;
  });
});