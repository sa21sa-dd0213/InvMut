import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant kill test - missing require(_s)", function () {
  it("should revert when a token transfer fails in the loop", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Setup: owner has 100 tokens, addr1 has 0 tokens
    await token.transfer(owner.address, ethers.parseEther("100"));
    
    // Approve airdrop contract to spend owner's tokens
    await token.approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    // Try to transfer tokens to multiple addresses, where addr3 has insufficient balance
    const recipients = [addr1.address, addr2.address, addr3.address];
    const amount = ethers.parseEther("50");
    
    // This should revert because addr3 doesn't have enough tokens
    // Original: require(_s) would catch the failure and revert
    // Mutant: would silently continue and return true
    await expect(
      airdrop.transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});