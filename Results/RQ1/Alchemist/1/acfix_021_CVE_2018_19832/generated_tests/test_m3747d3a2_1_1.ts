import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant m3747d3a2 (burn: totalSupply + instead of -)", function () {
  it("should kill the mutant by verifying totalSupply decreases after burn", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial total supply (500,000,000 NETM with 18 decimals)
    const initialSupply = await instance.totalSupply();
    
    // Burn a specific amount (e.g., 1000 tokens)
    const burnAmount = ethers.parseEther("1000");
    
    // Owner must have enough balance (they were assigned totalDistributed in NETM())
    await instance.NETM(); // Assigns totalDistributed to owner
    
    const balanceBefore = await instance.balanceOf(owner.address);
    expect(balanceBefore).to.be.at.least(burnAmount);
    
    // Execute burn
    await instance.burn(burnAmount);
    
    // Get new total supply
    const finalSupply = await instance.totalSupply();
    
    // In original: totalSupply = totalSupply - _value (decreases)
    // In mutant:   totalSupply = totalSupply + _value (increases)
    // Assert that totalSupply decreased by exactly burnAmount
    expect(finalSupply).to.equal(initialSupply - burnAmount);
    
    // Additional check: ensure owner's balance decreased accordingly
    const balanceAfter = await instance.balanceOf(owner.address);
    expect(balanceAfter).to.equal(balanceBefore - burnAmount);
  });
});