import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant m3dda1f8f (transferFrom recipient balance subtraction)", function () {
  it("should correctly increase recipient balance after transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: mint tokens to addr1 by calling distr via getTokens (since owner has tokens from NETM())
    await instance.connect(owner).NETM();
    
    // Give addr1 some tokens for the transferFrom test
    // First approve owner to spend addr1's tokens (addr1 needs tokens first)
    await instance.connect(owner).transfer(addr1.address, ethers.parseEther("1000"));
    
    // Owner approves addr2 to transfer on his behalf
    await instance.connect(owner).approve(addr2.address, ethers.parseEther("500"));
    
    // Record balance of addr1 before transfer
    const balanceBefore = await instance.balanceOf(addr1.address);
    
    // Execute transferFrom: addr2 transfers 500 tokens from owner to addr1
    await instance.connect(addr2).transferFrom(owner.address, addr1.address, ethers.parseEther("500"));
    
    // Check that addr1's balance increased (not decreased as mutant would cause)
    const balanceAfter = await instance.balanceOf(addr1.address);
    const expectedBalance = balanceBefore + ethers.parseEther("500");
    
    expect(balanceAfter).to.equal(expectedBalance);
  });
});