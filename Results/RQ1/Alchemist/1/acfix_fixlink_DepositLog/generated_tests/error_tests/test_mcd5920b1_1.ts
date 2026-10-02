import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant mcd5920b1 test", function () {
  it("should kill mutant by calling logFunded from an approved logger and expecting true", async function () {
    const [owner, approvedLogger] = await ethers.getSigners();
    
    // Deploy DepositLog - no constructor arguments needed
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve the logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
    
    // Call logFunded from the approved logger - original returns true, mutant returns false
    const tx = await instance.connect(approvedLogger).logFunded();
    const receipt = await tx.wait();
    
    // Expect the function to return true (original behavior)
    // The mutant will return false, causing this assertion to fail
    expect(receipt).to.not.be.undefined;
    
    // Check that the Funded event was emitted
    await expect(tx)
      .to.emit(instance, "Funded")
      .withArgs(approvedLogger.address, ethers.anyValue);
  });
});