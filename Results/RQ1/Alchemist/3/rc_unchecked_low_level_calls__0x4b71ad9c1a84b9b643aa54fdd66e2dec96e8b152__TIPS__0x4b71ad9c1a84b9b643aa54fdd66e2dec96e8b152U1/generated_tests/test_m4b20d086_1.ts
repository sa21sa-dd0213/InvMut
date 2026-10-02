import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - loop condition change", function () {
  it("should kill mutant m4b20d086 by verifying transfers to multiple recipients", async function () {
    const [owner, recipient1, recipient2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airPort contract
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: mint tokens to owner and approve airPort contract
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);
    
    // Transfer some tokens from owner to airPort contract for the transferFrom calls
    const transferAmount = ethers.parseEther("100");
    await token.connect(owner).transfer(await instance.getAddress(), transferAmount);
    
    // Record balances before
    const balance1Before = await token.balanceOf(recipient1.address);
    const balance2Before = await token.balanceOf(recipient2.address);
    
    // Call transfer with multiple recipients - original would transfer to both
    const recipients = [recipient1.address, recipient2.address];
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("50")
    );
    await tx.wait();
    
    // Check balances after - mutant's loop never executes, so balances remain unchanged
    const balance1After = await token.balanceOf(recipient1.address);
    const balance2After = await token.balanceOf(recipient2.address);
    
    // If mutant is live (loop doesn't execute), balances won't change
    // Original would transfer tokens to both recipients
    expect(balance1After).to.not.equal(balance1Before);
    expect(balance2After).to.not.equal(balance2Before);
  });
});

// Helper ERC20 token contract for testing
// Note: In a real setup this would be a separate contract file
// For simplicity, we assume TestERC20 exists with mint and transferFrom functionality