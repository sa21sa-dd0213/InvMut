import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transferFrom allowance addition bug", function () {
  it("should detect mutant that adds instead of subtracts from allowance in transferFrom", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // First, need to get some tokens to the owner for testing
    // The constructor sets balances[owner] = totalDistributed (200,000,000 tokens)
    // But we need to ensure the owner has tokens to transfer from
    
    // Approve spender to transfer 100 tokens from owner
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(spender.address, approveAmount);
    
    // Check initial allowance
    const initialAllowance = await instance.allowance(owner.address, spender.address);
    expect(initialAllowance).to.equal(approveAmount);
    
    // First transferFrom - transfer 50 tokens from owner to recipient
    const transferAmount = ethers.parseEther("50");
    await instance.connect(spender).transferFrom(owner.address, recipient.address, transferAmount);
    
    // Check allowance after first transfer
    // In original: allowance should decrease by 50
    // In mutant: allowance should increase by 50 (BUG)
    const allowanceAfterFirst = await instance.allowance(owner.address, spender.address);
    
    // Second transferFrom - attempt to transfer another 60 tokens (more than remaining allowance in original)
    const secondTransferAmount = ethers.parseEther("60");
    
    // In original contract, this should revert because remaining allowance would be 50
    // In mutant, allowance is now 150 (100+50), so it would succeed
    if (allowanceAfterFirst > secondTransferAmount) {
      // Mutant detected - allowance increased instead of decreased
      // The second transfer will succeed in mutant but should fail in original
      // We can detect the bug by checking that allowance increased
      expect(allowanceAfterFirst).to.be.gt(approveAmount.sub(transferAmount));
    } else {
      // This is the original behavior path - test that second transfer fails
      await expect(
        instance.connect(spender).transferFrom(owner.address, recipient.address, secondTransferAmount)
      ).to.be.reverted;
    }
    
    // Alternative direct detection: check if allowance was increased instead of decreased
    const expectedAllowance = approveAmount.sub(transferAmount);
    // In original: allowance should equal expectedAllowance
    // In mutant: allowance will be approveAmount + transferAmount = 150
    const isMutant = allowanceAfterFirst.gt(expectedAllowance);
    expect(isMutant).to.be.false; // This assertion will fail on mutant, killing it
  });
});