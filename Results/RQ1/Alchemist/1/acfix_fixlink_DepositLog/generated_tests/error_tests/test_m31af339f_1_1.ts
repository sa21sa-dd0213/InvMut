import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m31af339f - logSetupFailed event emission", function () {
  it("should emit SetupFailed event when logSetupFailed is called by approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed based on original code
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Verify logger is approved
    expect(await instance.connect(logger).approvedToLog(logger.address)).to.equal(true);

    // Get the current block timestamp before the call
    const block = await ethers.provider.getBlock("latest");
    const timestamp = block!.timestamp;

    // Call logSetupFailed and verify event emission
    await expect(instance.connect(logger).logSetupFailed())
      .to.emit(instance, "SetupFailed")
      .withArgs(logger.address, timestamp);
  });
});