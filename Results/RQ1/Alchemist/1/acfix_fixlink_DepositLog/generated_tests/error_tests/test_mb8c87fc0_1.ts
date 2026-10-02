import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant kill test", function () {
  it("should return true when logCreated is called by an approved logger", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner approves the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);

    // Call logCreated from the approved logger - should return true in original
    const result = await instance.connect(approvedLogger).logCreated(owner.address);
    
    // Assert that the function returns true
    expect(result).to.equal(true);
  });
});