import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - m1cb245bc", function () {
  it("should kill the mutant by calling distributeTokenPeriodic when balance > distributeAmount", async function () {
    const [owner, addr1, liquidityReceive] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceive.address);
    await dcf.waitForDeployment();
    
    // Get the distributeAddress (needs to be set by caller)
    // First, set the CFO (caller) to owner
    await dcf.setCaller(owner.address);
    
    // Set distribute address
    await dcf.setDistributeAddress(addr1.address);
    
    // Transfer additional tokens to the contract so balance > distributeAmount
    const distributeAmount = ethers.parseEther("2000");
    const extraAmount = ethers.parseEther("1000"); // Extra tokens to make balance > distributeAmount
    const totalTransfer = distributeAmount + extraAmount;
    
    // Owner sends tokens to contract address
    await dcf.transfer(await dcf.getAddress(), totalTransfer);
    
    // Now the contract balance is 3000 tokens which is > 2000 (distributeAmount)
    // The original requires balance >= distributeAmount (should pass)
    // The mutant requires balance == distributeAmount (should revert)
    
    // Wait for initTime to pass (initTime is 0 initially, so any timestamp > 0 works)
    // We can advance time or just call since initTime is 0 and nowTime > 0
    
    // This should succeed on original but fail on mutant
    await expect(
      dcf.connect(owner).distributeTokenPeriodic()
    ).to.not.be.reverted; // Will revert on mutant because balance (3000) != distributeAmount (2000)
  });
});