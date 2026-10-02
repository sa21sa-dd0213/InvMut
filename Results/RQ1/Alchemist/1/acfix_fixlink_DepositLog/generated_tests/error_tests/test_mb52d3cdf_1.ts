import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant mb52d3cdf test", function () {
  it("should return false for non-approved logger calling logExitedCourtesyCall", async function () {
    const [owner, nonApprovedLogger] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify that non-approved logger cannot call logExitedCourtesyCall
    // The original should return false, but the mutant will incorrectly return true
    const result = await instance.connect(nonApprovedLogger).logExitedCourtesyCall();
    expect(result).to.equal(false);
    
    // Also verify no event was emitted by checking the transaction receipt
    const tx = await instance.connect(nonApprovedLogger).logExitedCourtesyCall();
    const receipt = await tx.wait();
    
    // The ExitedCourtesyCall event should NOT be emitted for non-approved callers
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("ExitedCourtesyCall(address,uint256)")
    );
    expect(event).to.be.undefined;
  });
});