import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - setBlackBulk loop condition change", function () {
  it("should kill mutant m75488f8a by verifying setBlackBulk actually blacklists addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const liquidityReceiveAddress = addr1.address;
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set CFO address to allow calling setBlackBulk (onlyCaller modifier)
    await instance.connect(owner).setCaller(owner.address);
    
    // Create array of addresses to blacklist
    const addressesToBlacklist = [addr1.address, addr2.address];
    
    // Call setBlackBulk to blacklist the addresses
    await instance.connect(owner).setBlackBulk(addressesToBlacklist, true);
    
    // Verify that transfers FROM blacklisted addresses revert
    // Transfer some tokens to addr1 first to make it have balance
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("100"));
    
    // Attempt transfer from blacklisted address - should revert in original
    await expect(
      instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"))
    ).to.be.revertedWith("black address not transfer");
    
    // Also verify transfers TO blacklisted addresses revert
    // Transfer some tokens to owner to have balance
    await instance.connect(owner).transfer(addr2.address, ethers.parseEther("100"));
    
    // Attempt transfer to blacklisted address - should revert in original
    await expect(
      instance.connect(addr2).transfer(addr1.address, ethers.parseEther("10"))
    ).to.be.revertedWith("black address not transfer");
  });
});