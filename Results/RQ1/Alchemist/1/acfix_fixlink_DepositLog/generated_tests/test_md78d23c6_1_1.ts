import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - md78d23c6", function () {
  it("should emit FraudDuringSetup event when logFraudDuringSetup is called by an approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Verify logger is approved
    expect(await instance.connect(logger).approvedToLog(logger.address)).to.be.true;
    
    // Call logFraudDuringSetup and verify event emission
    const tx = await instance.connect(logger).logFraudDuringSetup();
    const receipt = await tx.wait();
    
    // Get the block timestamp
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const timestamp = block.timestamp;
    
    // Check that FraudDuringSetup event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "FraudDuringSetup")
      .withArgs(logger.address, timestamp);
  });
});