import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - frozen recipient", function () {
  it("should revert when transferring to a frozen account, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // First, transfer some tokens to addr1 so they can attempt a transfer
    await instance.connect(owner).transfer(addr1.address, 100);
    
    // Freeze addr2 (the recipient)
    await instance.connect(owner).freezeAccount(addr2.address, true);
    
    // Attempt to transfer from addr1 to frozen addr2 - this should revert in original
    await expect(
      instance.connect(addr1).transfer(addr2.address, 50)
    ).to.be.reverted;
  });
});