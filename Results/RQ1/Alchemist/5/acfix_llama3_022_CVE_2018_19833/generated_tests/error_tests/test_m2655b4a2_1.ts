import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert transfer from frozen account (mutant m2655b4a2 kill)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 first so they have a balance
    const transferAmount = 100;
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Freeze addr1's account
    await instance.connect(owner).freezeAccount(addr1.address, true);
    
    // Attempt to transfer from frozen addr1 - should revert
    await expect(
      instance.connect(addr1).transfer(addr2.address, 50)
    ).to.be.reverted;
  });
});