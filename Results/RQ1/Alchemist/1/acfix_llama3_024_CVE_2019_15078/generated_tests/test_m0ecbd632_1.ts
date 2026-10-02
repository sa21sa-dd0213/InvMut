import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m0ecbd632 - totalRemaining division bug", function () {
  it("should detect that totalRemaining is incorrectly calculated using division instead of subtraction", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial state - original: totalRemaining = totalSupply - totalDistributed = 500M - 200M = 300M
    // Mutant: totalRemaining = totalSupply / totalDistributed = 500M / 200M = 2 (integer division)
    const totalRemaining = await instance.totalRemaining();
    
    // In the original, totalRemaining should be 300,000,000 * 10^18
    // In the mutant, it would be 2 * 10^18 or just 2 depending on implementation
    // We expect it to be 300M tokens, not 2 tokens
    const expectedTotalRemaining = ethers.parseEther("300000000");
    expect(totalRemaining).to.equal(expectedTotalRemaining);

    // Now test that getTokens() works correctly - should distribute value (1000 tokens)
    // In the mutant, value (1000 tokens) > totalRemaining (2 tokens), so getTokens would fail or distribute wrong amount
    const initialBalance = await instance.balanceOf(investor.address);
    
    // Call getTokens from non-blacklisted investor
    await instance.connect(investor).getTokens({ value: 0 });
    
    const finalBalance = await instance.balanceOf(investor.address);
    const receivedAmount = finalBalance - initialBalance;
    
    // In the original, investor should receive 1000 tokens
    // In the mutant, either transaction reverts (because value > totalRemaining) or receives only 2 tokens
    expect(receivedAmount).to.equal(ethers.parseEther("1000"));
  });
});