import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test - mf450e376", function () {
  it("should kill the mutant by verifying logLiquidated returns true and emits event for approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed based on the provided code)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Verify the logger is approved
    expect(await instance.connect(logger).approvedToLog(logger.address)).to.be.true;
    
    // Now call logLiquidated from the approved logger
    // In the original contract, this should return true and emit Liquidated event
    // In the mutant, it will always return false and not emit the event
    const tx = await instance.connect(logger).logLiquidated();
    const receipt = await tx.wait();
    
    // Assert that the function returned true (kills the mutant which returns false)
    // Note: We need to check the return value via a static call
    const returnValue = await instance.connect(logger).callStatic.logLiquidated();
    expect(returnValue).to.be.true;
    
    // Also verify the Liquidated event was emitted
    const block = await ethers.provider.getBlock("latest");
    await expect(tx)
      .to.emit(instance, "Liquidated")
      .withArgs(logger.address, block.timestamp);
  });
});