import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m51cb43c0 by burning exact balance amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Get owner's balance (should be initialSupply since decimals = 0)
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Attempt to burn exactly the owner's full balance
    // Original: requires balance >= _value, so burning exact balance works
    // Mutant: requires balance > _value, so burning exact balance should revert
    await expect(
      instance.connect(owner).burn(ownerBalance)
    ).to.not.be.reverted;
    
    // Verify balance is now 0 and totalSupply decreased accordingly
    expect(await instance.balanceOf(owner.address)).to.equal(0);
    expect(await instance.totalSupply()).to.equal(0);
  });
});