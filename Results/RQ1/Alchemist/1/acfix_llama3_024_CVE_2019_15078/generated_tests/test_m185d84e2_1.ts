import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m185d84e2 - burn division bug", function () {
  it("should detect division instead of subtraction in totalDistributed update during burn", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalDistributed value (set in constructor to 200000000e18)
    const initialTotalDistributed = await instance.totalDistributed();
    
    // Burn a specific amount (e.g., 1000 tokens)
    const burnAmount = ethers.parseEther("1000");
    await instance.connect(owner).burn(burnAmount);
    
    // Get totalDistributed after burn
    const finalTotalDistributed = await instance.totalDistributed();
    
    // With correct subtraction: final = initial - burnAmount
    // With mutant division: final = initial / burnAmount (a very small number)
    // The division result would be orders of magnitude smaller than the correct subtraction result
    const expectedAfterSubtraction = initialTotalDistributed - burnAmount;
    
    // Verify that totalDistributed was NOT divided (i.e., it's not equal to initial / burnAmount)
    const divisionResult = initialTotalDistributed / burnAmount;
    expect(finalTotalDistributed).to.not.equal(divisionResult);
    
    // Verify the correct subtraction behavior
    expect(finalTotalDistributed).to.equal(expectedAfterSubtraction);
  });
});