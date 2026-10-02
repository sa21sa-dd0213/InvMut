import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - logFraudDuringSetup access control", function () {
  it("should return false when unauthorized caller calls logFraudDuringSetup", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Call logFraudDuringSetup from an unauthorized address
    const result = await instance.connect(unauthorizedUser).logFraudDuringSetup();
    
    // The original contract returns false for unauthorized callers
    // The mutant would return true (bypassing the check)
    expect(result).to.equal(false);
  });
});