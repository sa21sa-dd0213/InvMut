import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test for logFraudDuringSetup", function () {
  it("should emit FraudDuringSetup event when called by approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logFraudDuringSetup from approved logger and expect event emission
    const tx = await instance.connect(logger).logFraudDuringSetup();
    const receipt = await tx.wait();

    // Verify the event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "FraudDuringSetup")
      .withArgs(logger.address, receipt.block.timestamp);
  });
});