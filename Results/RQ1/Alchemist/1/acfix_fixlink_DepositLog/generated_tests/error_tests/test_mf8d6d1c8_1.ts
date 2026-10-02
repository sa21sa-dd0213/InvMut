import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - mf8d6d1c8", function () {
  it("should kill mutant by calling logSetupFailed from unapproved address and expecting false return", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed based on original code)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Ensure unauthorized caller is not an approved logger
    const isApproved = await instance.approvedToLog(unauthorized.address);
    expect(isApproved).to.equal(false);
    
    // Call logSetupFailed from unauthorized address
    // In the original: should return false because caller is not approved
    // In the mutant: will incorrectly return true and emit event
    const tx = await instance.connect(unauthorized).logSetupFailed();
    const receipt = await tx.wait();
    
    // Verify the function returned false (original behavior)
    // We need to check the return value - in ethers v6 we can check via callStatic
    const returnValue = await instance.connect(unauthorized).logSetupFailed.staticCall();
    expect(returnValue).to.equal(false);
    
    // Additionally verify no SetupFailed event was emitted
    // If mutant emitted event, this check will fail
    const events = receipt.logs.filter(log => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed && parsed.name === "SetupFailed";
      } catch {
        return false;
      }
    });
    expect(events.length).to.equal(0);
  });
});