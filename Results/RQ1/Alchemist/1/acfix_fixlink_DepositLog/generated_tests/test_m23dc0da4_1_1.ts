import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - m23dc0da4", function () {
  it("should emit CourtesyCalled event when called by approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy the contract - no constructor arguments needed for DepositLog
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner approves logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logCourtesyCalled from the approved logger and check for event emission
    const tx = await instance.connect(logger).logCourtesyCalled();
    const receipt = await tx.wait();

    // Check that the CourtesyCalled event was emitted with the correct parameters
    await expect(tx)
      .to.emit(instance, "CourtesyCalled")
      .withArgs(logger.address, ethers.anyValue);
  });

  it("should return true when called by approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logCourtesyCalled and verify it returns true
    const result = await instance.connect(logger).logCourtesyCalled.staticCall();
    expect(result).to.equal(true);
  });
});