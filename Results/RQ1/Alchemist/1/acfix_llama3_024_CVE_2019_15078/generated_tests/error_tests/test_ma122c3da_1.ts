import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant ma122c3da - burn function", function () {
  it("should detect mutant where burn adds instead of subtracts from balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, distribute some tokens to addr1 so they have a balance to burn
    const distributionAmount = ethers.parseEther("1000");
    await instance.connect(owner).distr(addr1.address, distributionAmount);
    
    // Get balance before burning
    const balanceBefore = await instance.balanceOf(addr1.address);
    
    // Burn a specific amount
    const burnAmount = ethers.parseEther("100");
    await instance.connect(addr1).burn(burnAmount);
    
    // Get balance after burning
    const balanceAfter = await instance.balanceOf(addr1.address);
    
    // In the original contract: balanceAfter = balanceBefore - burnAmount
    // In the mutant: balanceAfter = balanceBefore + burnAmount
    // So we expect balanceAfter to be LESS than balanceBefore (original behavior)
    // The mutant would make balanceAfter GREATER than balanceBefore, so this assertion fails
    expect(balanceAfter).to.be.lessThan(balanceBefore);
    
    // Also verify the exact difference matches the burn amount (original behavior)
    const expectedBalance = balanceBefore - burnAmount;
    expect(balanceAfter).to.equal(expectedBalance);
  });
});