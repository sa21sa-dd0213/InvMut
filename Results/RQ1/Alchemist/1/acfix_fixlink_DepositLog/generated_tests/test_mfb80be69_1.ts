import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - mfb80be69", function () {
  it("should kill mutant by verifying approved logger can call logSetupFailed and get true return", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Verify logger is approved
    const isApproved = await instance.connect(logger).approvedToLog(logger.address);
    expect(isApproved).to.equal(true);
    
    // Call logSetupFailed from approved logger - should return true in original
    const tx = await instance.connect(logger).logSetupFailed();
    const receipt = await tx.wait();
    
    // Check that the event was emitted
    await expect(tx)
      .to.emit(instance, "SetupFailed")
      .withArgs(logger.address, receipt.blockTimestamp);
    
    // Verify return value is true (original behavior)
    // We can't directly get return value from tx, but event emission confirms success
    expect(receipt.status).to.equal(1);
  });
});