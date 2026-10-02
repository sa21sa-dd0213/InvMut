import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should kill mutant mc683db91 by verifying balance decreases on burn", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give addr1 some tokens via distr (calling getTokens with ETH)
    // Send ETH to trigger getTokens which distributes tokens
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get addr1's initial balance after distribution
    // Note: owner got tokens from getTokens, we need to transfer some to addr1
    // Actually, let's use the NETM() function to give owner tokens, then transfer to addr1
    await instance.NETM();
        
    // Transfer some tokens to addr1
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
        
    // Get addr1's balance before burn
    const balanceBefore = await instance.balanceOf(addr1.address);
        
    // Burn tokens from addr1 (must be called by addr1 since burn checks msg.sender)
    const burnAmount = ethers.parseEther("500");
    // Note: burn has onlyOwner modifier, so we need to call from owner
    await instance.connect(owner).burn(burnAmount);
        
    // Get addr1's balance after burn
    const balanceAfter = await instance.balanceOf(addr1.address);
        
    // In original: balance decreases by burn amount
    // In mutant: balance increases by burn amount (bug)
    // So this assertion should pass on original but fail on mutant
    expect(balanceAfter).to.equal(balanceBefore - burnAmount);
        
    // Also verify totalSupply decreased correctly
    const totalSupplyAfter = await instance.totalSupply();
    const expectedTotalSupply = ethers.parseEther("500000000") - burnAmount;
    expect(totalSupplyAfter).to.equal(expectedTotalSupply);
  });
});