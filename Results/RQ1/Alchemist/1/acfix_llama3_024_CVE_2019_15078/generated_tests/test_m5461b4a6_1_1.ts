import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m5461b4a6 - getTokens value condition", function () {
  it("should keep value unchanged when value is less than totalRemaining", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state
    const initialValue = await instance.value();
    const initialTotalRemaining = await instance.totalRemaining();
    
    // Verify initial value is less than totalRemaining for a meaningful test
    expect(initialValue).to.be.lessThan(initialTotalRemaining);

    // addr1 calls getTokens() - not blacklisted, distribution not finished
    await instance.connect(addr1).getTokens({ value: 0 });

    // In original: value should remain unchanged because value < totalRemaining
    // In mutant: value would be set to totalRemaining (incorrectly)
    const finalValue = await instance.value();
    
    // Assert that value did NOT change (should equal initial value)
    // This will fail on mutant where value is always set to totalRemaining
    expect(finalValue).to.equal(initialValue);
  });
});