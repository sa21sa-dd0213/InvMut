import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m4f1d4b22 - logSetupFailed return value", function () {
  it("should return true when approved logger calls logSetupFailed (original behavior)", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy contract - no constructor arguments needed for DepositLog
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logSetupFailed from approved logger and check return value
    const result = await instance.connect(logger).logSetupFailed();

    // The return value should be true for the original contract
    // The mutant removes 'return true;' causing it to return false
    expect(result).to.equal(true);
  });
});