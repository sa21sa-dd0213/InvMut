import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - logCourtesyCalled", function () {
  it("should kill mutant m2f6d8a73 by calling logCourtesyCalled from an approved logger", async function () {
    const [owner, approvedLogger, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve a logger
    await instance.connect(owner).setApprovedLogger(approvedLogger.address, true);
    
    // Verify the logger is approved
    expect(await instance.approvedLoggers(approvedLogger.address)).to.equal(true);
    
    // Call logCourtesyCalled from the approved logger
    const tx = await instance.connect(approvedLogger).logCourtesyCalled();
    const receipt = await tx.wait();
    
    // On original: should return true and emit CourtesyCalled event
    // On mutant: will return false (since if(true) return false) and NOT emit the event
    // The mutant will not emit the event, so we check for the event emission
    
    // Check that the event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "CourtesyCalled")
      .withArgs(approvedLogger.address, ethers.anyValue); // timestamp is dynamic
      
    // Additionally, verify the return value is true
    const result = await instance.connect(approvedLogger).callStatic.logCourtesyCalled();
    expect(result).to.equal(true);
  });
});