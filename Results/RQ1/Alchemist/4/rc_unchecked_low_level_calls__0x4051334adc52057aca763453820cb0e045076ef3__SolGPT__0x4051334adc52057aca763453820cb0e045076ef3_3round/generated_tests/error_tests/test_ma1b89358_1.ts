import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358", function () {
  it("should revert when a token transfer fails due to insufficient balance or allowance", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const token = await ERC20Factory.deploy("Test Token", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airdrop contract
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Setup: give owner some tokens, but NOT the "from" address
    await token.mint(owner.address, ethers.parseEther("100"));
    
    // Approve airdrop to spend tokens from owner (not from from address)
    await token.connect(owner).approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    // The "from" address has no tokens and no allowance - this transfer should fail
    const recipients = [recipient.address];
    const amount = ethers.parseEther("10");
    
    // This should revert because the "from" address has insufficient balance/allowance
    await expect(
      airdrop.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});