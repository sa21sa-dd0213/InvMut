import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mfbbfdfc5", function () {
  it("should revert when burning amount less than balance (mutant requires _value >= balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribute tokens to addr1 using getTokens (requires ETH value)
    // Send enough ETH to trigger distribution
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    
    // Check addr1's balance after distribution
    const balance = await instance.balanceOf(addr1.address);
    
    // Burn an amount less than the balance
    // Original: require(_value <= balances[msg.sender]) - should succeed
    // Mutant: require(_value >= balances[msg.sender]) - should revert
    const burnAmount = balance / 2n; // Burn half of the balance
    
    await expect(
      instance.connect(addr1).burn(burnAmount)
    ).to.be.reverted;
  });
});