import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - m329e2a5b", function () {
  it("should return true when logLiquidated is called by an approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);
    
    // Call logLiquidated from the approved logger and check return value
    const tx = await instance.connect(logger).logLiquidated();
    const receipt = await tx.wait();
    
    // The original contract returns true, but the mutant returns false
    // We need to call it as a static call to get the return value
    const result = await instance.connect(logger).logLiquidated.staticCall();
    expect(result).to.equal(true);
  });
});