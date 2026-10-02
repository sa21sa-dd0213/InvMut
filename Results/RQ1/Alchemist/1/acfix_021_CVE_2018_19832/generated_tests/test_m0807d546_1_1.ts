import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should revert when burning more tokens than balance (mutant kills balance check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Give some tokens to addr1 via distribution
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    
    // Get addr1's balance after distribution
    const balance = await instance.balanceOf(addr1.address);
    
    // Attempt to burn more than balance - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).burn(balance + 1n)
    ).to.be.reverted;
  });
});