import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - distr division vs subtraction", function () {
  it("should detect mutant where totalRemaining uses division instead of subtraction", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state before any distribution
    const initialTotalDistributed = await instance.totalDistributed();
    const initialTotalRemaining = await instance.totalRemaining();
    const initialValue = await instance.value();

    // Call getTokens() which internally calls distr()
    // This will distribute value tokens and update totalRemaining
    await instance.connect(addr1).getTokens();

    // Get state after distribution
    const finalTotalRemaining = await instance.totalRemaining();
    const finalTotalDistributed = await instance.totalDistributed();

    // Calculate what totalRemaining SHOULD be with subtraction:
    // totalRemaining = initialTotalRemaining - initialValue
    const expectedTotalRemaining = initialTotalRemaining - initialValue;

    // Calculate what totalRemaining would be with division:
    // totalRemaining = initialTotalRemaining / initialValue
    const divisionResult = initialTotalRemaining / initialValue;

    // The mutant would produce a different result than subtraction
    // We assert that totalRemaining follows the subtraction logic (original behavior)
    expect(finalTotalRemaining).to.equal(expectedTotalRemaining);
    
    // Additionally verify that the division result would be different
    // (to confirm the test would catch the mutant)
    expect(finalTotalRemaining).to.not.equal(divisionResult);
    
    // Verify totalDistributed increased correctly (same in both versions)
    expect(finalTotalDistributed).to.equal(initialTotalDistributed + initialValue);
  });
});