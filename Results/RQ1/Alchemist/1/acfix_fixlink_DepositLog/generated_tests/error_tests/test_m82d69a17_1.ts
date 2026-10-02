import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - m82d69a17", function () {
  it("should kill mutant m82d69a17 by calling logStartedLiquidation from an approved logger and expecting true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DepositLog - no constructor arguments needed
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);
    
    // Verify addr1 is approved
    expect(await instance.approvedLoggers(addr1.address)).to.equal(true);
    
    // Call logStartedLiquidation from approved logger addr1
    // Original: returns true for approved logger
    // Mutant: always returns false (if (true) return false)
    const result = await instance.connect(addr1).logStartedLiquidation(false);
    
    // The mutant will return false, while original returns true
    // We need to check the return value via a transaction receipt
    const tx = await instance.connect(addr1).logStartedLiquidation(false);
    const receipt = await tx.wait();
    
    // For the mutant, the function returns false and the event is NOT emitted
    // For the original, the function returns true and the event IS emitted
    // Check that the event was emitted - this will fail on the mutant
    await expect(tx)
      .to.emit(instance, "StartedLiquidation")
      .withArgs(addr1.address, false, anyValue); // anyValue for timestamp
  });
});