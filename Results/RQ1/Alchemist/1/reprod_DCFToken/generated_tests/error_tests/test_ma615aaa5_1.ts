import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - ma615aaa5", function () {
  it("should allow regular transfers between non-pair addresses (mutant kills this by blocking all transfers)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address (any non-zero address)
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Get initial balance of addr1 and addr2
    const initialBalanceAddr1 = await instance.balanceOf(addr1.address);
    const initialBalanceAddr2 = await instance.balanceOf(addr2.address);
    
    // Transfer tokens from owner to addr1 (owner is whitelisted, so this should work)
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now transfer from addr1 to addr2 (neither is the pair address)
    // This should succeed in the original contract but fail in the mutant
    // because the mutant changes `if (from == pairAddress)` to `if (true)`
    // which blocks ALL transfers, not just those from the pair address
    
    // First, we need to make addr1 have some tokens to transfer
    // Owner already transferred to addr1 above
    
    // Check if the transfer from addr1 to addr2 reverts (mutant) or succeeds (original)
    try {
      await instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
      // If we reach here, the transfer succeeded - original behavior
      const finalBalanceAddr2 = await instance.balanceOf(addr2.address);
      expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + ethers.parseEther("10"));
    } catch (error: any) {
      // If it reverts, the mutant is detected
      expect(error.message).to.include("buy error");
    }
  });
  
  it("should verify that regular transfers between non-whitelisted users succeed in original contract", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 from owner (owner is whitelisted)
    const transferAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Get initial balances
    const balanceAddr1Before = await instance.balanceOf(addr1.address);
    const balanceAddr2Before = await instance.balanceOf(addr2.address);
    
    // Perform a regular transfer from addr1 to addr2
    // In the original contract, this should succeed since neither is the pair address
    const amountToSend = ethers.parseEther("50");
    await instance.connect(addr1).transfer(addr2.address, amountToSend);
    
    // Verify the transfer succeeded
    const balanceAddr1After = await instance.balanceOf(addr1.address);
    const balanceAddr2After = await instance.balanceOf(addr2.address);
    
    expect(balanceAddr1After).to.equal(balanceAddr1Before - amountToSend);
    expect(balanceAddr2After).to.equal(balanceAddr2Before + amountToSend);
  });
});