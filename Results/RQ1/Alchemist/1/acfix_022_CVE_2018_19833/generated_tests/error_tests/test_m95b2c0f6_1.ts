import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m95b2c0f6 by burning exact balance amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const initialSupply = ethers.parseEther("1000");
    const tokenName = "ERCDDAToken";
    const tokenSymbol = "ERCDD";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Get owner's balance (should be initialSupply since decimals = 0)
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Try to burn the exact owner balance
    // Original: should succeed because balance >= value
    // Mutant: should revert because balance > value is false (they are equal)
    await expect(
      instance.burn(ownerBalance)
    ).to.not.be.reverted;
    
    // Verify the balance is now 0
    expect(await instance.balanceOf(owner.address)).to.equal(0);
    expect(await instance.totalSupply()).to.equal(0);
  });
});