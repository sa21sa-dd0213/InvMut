import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant mdc104acc (transferFrom allowance check)", function () {
  it("should revert when transferring amount exceeding allowance (original behavior), but mutant incorrectly allows it", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments as per contract code)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, get some tokens for owner to transfer from
    // The constructor sets balances[owner] = totalDistributed (200M tokens)
    // We'll use the distribution mechanism to give tokens to a test account
    // Actually, let's use the owner directly since they have tokens from constructor
    
    // Owner approves spender to spend 100 tokens
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Owner needs to have tokens to transfer from - they have 200M tokens from constructor
    // But we need to transfer tokens from owner to spender first so spender can transferFrom
    // Actually, transferFrom works with the from address having tokens, so owner has tokens
    
    // Try to transfer 200 tokens (more than approved 100) from owner to recipient
    // This should revert in the original contract because 200 > 100 (allowance)
    // But the mutant with >= will allow it (200 >= 100 is true)
    const transferAmount = ethers.parseEther("200");
    
    // The spender attempts to transfer more than their allowance
    await expect(
      instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount)
    ).to.be.reverted;
    
    // If this test passes (reverts), the original contract behavior is confirmed
    // The mutant would NOT revert here, so this test would fail on the mutant
  });
});