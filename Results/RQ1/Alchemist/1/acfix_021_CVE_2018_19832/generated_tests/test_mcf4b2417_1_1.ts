import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant mcf4b2417", function () {
  it("should kill mutant that replaces 'value > totalRemaining' with 'true' by checking token distribution amount when value < totalRemaining", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call getTokens to reduce totalRemaining and update value
    await instance.connect(investor).getTokens({ value: ethers.parseEther("0.1") });

    // Record the balance after first distribution to know the exact value used
    const balanceAfterFirst = await instance.balanceOf(investor.address);
    const firstValue = balanceAfterFirst;

    // Now totalRemaining should be less than initial value (2500e18)
    // value should have been reduced by the multiplicative update in getTokens
    const currentValue = await instance.value();
    const totalRemaining = await instance.totalRemaining();

    // Ensure current value is less than totalRemaining for this test
    expect(currentValue).to.be.lessThan(totalRemaining);

    // Get a second investor who will call getTokens
    const [investor2] = await ethers.getSigners();

    // Call getTokens - in original contract, value should remain unchanged (since value <= totalRemaining)
    // In mutant, value would be overwritten to totalRemaining, giving more tokens than expected
    await instance.connect(investor2).getTokens({ value: ethers.parseEther("0.1") });

    const balanceInvestor2 = await instance.balanceOf(investor2.address);

    // The expected amount is the current value (unchanged), not totalRemaining
    // If mutant is active, investor2 would get totalRemaining tokens which is much larger
    expect(balanceInvestor2).to.equal(currentValue);

    // Additional check: investor2 should NOT have received totalRemaining amount
    expect(balanceInvestor2).to.not.equal(totalRemaining);
  });
});