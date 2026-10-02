import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m6e8b02d4 - blacklist check removal", function () {
  it("should revert when transfer from blacklisted address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address (can use any valid address)
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    
    // Get the DCF token address
    const dcfAddress = await instance.getAddress();
    
    // Transfer some tokens to addr1 so they have balance to transfer
    const initialSupply = ethers.parseEther("2000000");
    const transferAmount = ethers.parseEther("1000");
    
    // Owner sends tokens to addr1
    let tx = await instance.transfer(addr1.address, transferAmount);
    await tx.wait();
    
    // Verify addr1 has tokens
    expect(await instance.balanceOf(addr1.address)).to.equal(transferAmount);
    
    // Set the caller (cfo) to be the owner for setting blacklist
    await instance.setCaller(owner.address);
    
    // Add addr1 to blacklist
    await instance.setBlack(addr1.address, true);
    
    // Attempt transfer from blacklisted address (addr1) to addr2
    // This should revert because addr1 is blacklisted
    await expect(
      instance.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
    ).to.be.revertedWith("black address not transfer");
    
    // Also test that the blacklisted address cannot receive tokens
    await expect(
      instance.connect(addr2).transfer(addr1.address, ethers.parseEther("100"))
    ).to.be.revertedWith("black address not transfer");
  });
});