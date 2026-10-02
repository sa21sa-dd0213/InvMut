import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - mutant me7a18801 detection", function () {
  it("should kill mutant by verifying totalRemaining decreases after distribution", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalRemaining
    const initialTotalRemaining = await instance.totalRemaining();
    
    // Get the value to be distributed
    const value = await instance.value();
    
    // Call getTokens() from addr1 to trigger distr()
    await instance.connect(addr1).getTokens();
    
    // Get updated totalRemaining
    const finalTotalRemaining = await instance.totalRemaining();
    
    // Verify totalRemaining decreased by exactly the distributed amount
    // In the original contract: totalRemaining = totalRemaining - _amount
    // In the mutant: totalRemaining = totalRemaining + _amount
    // So we expect a decrease, not an increase
    expect(finalTotalRemaining).to.equal(initialTotalRemaining - value);
  });
});