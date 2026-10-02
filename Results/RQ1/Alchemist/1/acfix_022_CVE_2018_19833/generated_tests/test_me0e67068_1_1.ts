import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant me0e67068 by burning partial balance (value less than full balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const initialSupply = ethers.parseEther("1000");
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Owner has full balance of 1000 tokens (initialSupply * 10^0 since decimals = 0)
    const ownerBalance = await instance.balanceOf(owner.address);
    const burnAmount = ownerBalance / 2n; // Burn exactly half of the balance
    
    // This should succeed on original (balance >= burnAmount) but revert on mutant (balance == burnAmount is false)
    await expect(instance.burn(burnAmount)).to.not.be.reverted;
    
    // Verify the burn was successful
    const newBalance = await instance.balanceOf(owner.address);
    expect(newBalance).to.equal(ownerBalance - burnAmount);
  });
});