import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - ma47bb1ba", function () {
  it("should return true when logCourtesyCalled is called by an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();

    // Deploy DepositLog - no constructor arguments needed
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    // Call logCourtesyCalled from the approved logger and check return value
    const result = await instance.connect(approvedLogger).logCourtesyCalled();

    // The return value should be true (original behavior)
    expect(result).to.equal(true);
  });
});