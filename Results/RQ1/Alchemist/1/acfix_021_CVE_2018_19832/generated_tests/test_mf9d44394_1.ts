import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant mf9d44394 (burn division)", function () {
  it("should kill the mutant by verifying totalSupply decreases by exact burn amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalSupply
    const initialTotalSupply = await instance.totalSupply();
    
    // Burn a specific amount of tokens from owner's balance
    const burnAmount = ethers.parseEther("1000");
    
    // Owner needs to have tokens to burn - call NETM() to initialize owner balance
    await instance.NETM();
    
    // Record totalSupply before burn
    const supplyBeforeBurn = await instance.totalSupply();
    
    // Execute burn
    await instance.burn(burnAmount);
    
    // Get totalSupply after burn
    const supplyAfterBurn = await instance.totalSupply();
    
    // In original: totalSupply = totalSupply - burnAmount
    // In mutant: totalSupply = totalSupply / burnAmount
    // The original should give: supplyAfterBurn = supplyBeforeBurn - burnAmount
    // The mutant would give a completely different (much smaller) value
    // We expect the original behavior
    expect(supplyAfterBurn).to.equal(supplyBeforeBurn - burnAmount);
  });
});