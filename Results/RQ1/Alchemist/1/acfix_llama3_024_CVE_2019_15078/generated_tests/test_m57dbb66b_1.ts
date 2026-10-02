import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - mutant m57dbb66b detection", function () {
  it("should revert when transferring exact full balance after mutant changes <= to <", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Distribute tokens to addr1 so they have a balance
    const distributionAmount = ethers.parseEther("1000");
    // Need to call getTokens() which uses value and distribution mechanism
    // First, fund the contract with ETH to allow getTokens to work
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Call getTokens from addr1 to give them tokens
    await instance.connect(addr1).getTokens();
    
    // Get addr1's balance after distribution
    const balance = await instance.balanceOf(addr1.address);
    
    // Transfer exact full balance - should succeed on original but fail on mutant
    await expect(
      instance.connect(addr1).transfer(owner.address, balance)
    ).to.be.reverted;
  });
});