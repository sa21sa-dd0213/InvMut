import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m30b39286 detection", function () {
  it("should detect mutant that removes return statement from logFunded", async function () {
    const [owner, logger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Verify the logger is approved
    expect(await instance.approvedToLog(logger.address)).to.equal(true);

    // Call logFunded and expect it to return true
    // If the mutant removed the return statement, this will fail
    const tx = await instance.connect(logger).logFunded();
    const receipt = await tx.wait();
    
    // The function should return true; if mutant removed return, it will revert or return false
    expect(await instance.connect(logger).logFunded()).to.equal(true);
  });
});