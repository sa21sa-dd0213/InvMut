import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - logFraudDuringSetup", function () {
  it("should return true when called by an approved logger, but mutant returns false", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments as per original contract)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Verify the logger is approved
    expect(await instance.approvedToLog(logger.address)).to.equal(true);
    
    // Call logFraudDuringSetup from the approved logger - should return true in original
    const result = await instance.connect(logger).logFraudDuringSetup();
    
    // The transaction receipt should have the event, but we assert the return value
    expect(result).to.equal(true);
  });
});