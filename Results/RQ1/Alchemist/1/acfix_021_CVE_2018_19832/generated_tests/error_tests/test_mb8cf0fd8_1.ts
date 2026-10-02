import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - mb8cf0fd8", function () {
  it("should kill mutant by verifying token distribution value decay after multiple getTokens calls", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the initial value
    const initialValue = await instance.value();
    
    // First call: addr1 gets tokens (should work as not blacklisted)
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    
    // Get value after first call
    const valueAfterFirstCall = await instance.value();
    
    // Calculate expected value for original: (initialValue / 100000) * 99999
    // For mutant: (initialValue - 100000) * 99999
    // The mutant will produce a much smaller value (negative after subtraction)
    // Let's call getTokens again from addr2
    await instance.connect(addr2).getTokens({ value: ethers.parseEther("1") });
    
    const valueAfterSecondCall = await instance.value();
    
    // Call getTokens from addr3
    await instance.connect(addr3).getTokens({ value: ethers.parseEther("1") });
    
    const valueAfterThirdCall = await instance.value();
    
    // For the original contract: value decreases by ~0.001% each time
    // For the mutant: value becomes negative large numbers after subtraction then multiplied
    // Check that valueAfterThirdCall is positive (original behavior)
    // The mutant would make value astronomically large negative or positive
    expect(valueAfterThirdCall).to.be.lt(valueAfterSecondCall);
    expect(valueAfterSecondCall).to.be.lt(valueAfterFirstCall);
    expect(valueAfterFirstCall).to.be.lt(initialValue);
    
    // Additional check: verify the proportional decrease is small (original behavior)
    // Original: value2 = value1 * 99999 / 100000 ≈ 0.99999 * value1
    // Mutant: value2 = (value1 - 100000) * 99999 → completely different scale
    const expectedOriginalRatio = 99999n * ethers.parseEther("1") / 100000n;
    const actualRatio = valueAfterSecondCall * ethers.parseEther("1") / valueAfterFirstCall;
    
    // If mutant is alive, the ratio will be drastically different from expected
    // This assertion will fail on mutant, killing it
    expect(actualRatio).to.be.closeTo(expectedOriginalRatio, ethers.parseEther("0.01"));
  });
});