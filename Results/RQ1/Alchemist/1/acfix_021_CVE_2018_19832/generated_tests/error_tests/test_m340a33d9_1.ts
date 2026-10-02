import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant detection - m340a33d9", function () {
  it("should detect mutant that replaces + with * in distr balance update", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // First distribution - investor gets tokens
    const initialValue = await contract.value();
    await contract.connect(investor).getTokens();
    
    const balanceAfterFirst = await contract.balanceOf(investor.address);
    // In original: balance = 0 + initialValue = initialValue
    // In mutant: balance = 0 * initialValue = 0
    // So after first call, mutant would show 0 balance
    
    // Second distribution - call getTokens again (but need to bypass blacklist check)
    // The blacklist mapping is set to true after first call, so we need a fresh investor
    const [investor2] = await ethers.getSigners();
    
    // Reset value by calling distr directly through owner? No - use a new account
    // Actually let's use a different approach: use a new investor for second call
    // But we need to ensure value is sufficient - it decreases each time
    
    // Better approach: test with a single investor but check balance after first call
    // In original: balanceAfterFirst should be > 0
    // In mutant: balanceAfterFirst should be 0 (since 0 * anything = 0)
    
    expect(balanceAfterFirst).to.be.gt(0);
    // This assertion passes on original, fails on mutant (where balance is 0)
  });
});