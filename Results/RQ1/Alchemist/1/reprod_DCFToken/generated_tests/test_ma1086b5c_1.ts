import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setBlackBulk off-by-one", function () {
  it("should kill the mutant by calling setBlackBulk with an array of addresses and expecting no revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Set the caller (cfo) to owner so we can call setBlackBulk
    await instance.setCaller(owner.address);
    
    // Create an array of addresses to blacklist
    const addressesToBlacklist = [addr1.address, addr2.address];
    
    // This call should succeed on the original (i < length) but revert on the mutant (i <= length)
    // because the mutant will try to access index 2 which is out of bounds
    await expect(
      instance.setBlackBulk(addressesToBlacklist, true)
    ).to.not.be.reverted;
    
    // Verify that the addresses were actually blacklisted
    // We can check by attempting a transfer from a blacklisted address
    // First, mint some tokens to addr1
    await instance.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Now try to transfer from addr1 to addr2 - should revert because addr1 is blacklisted
    await expect(
      instance.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
    ).to.be.revertedWith("black address not transfer");
  });
});