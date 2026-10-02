import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant ma1b89358 test", function () {
  it("should revert when token transferFrom fails (mutant removes require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Deploy a simple ERC20 token that will revert on transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Transfer tokens to owner so they have allowance to spend
    await token.transfer(owner.address, ethers.parseEther("100"));
    
    // Approve the airdrop contract to spend tokens (but with 0 allowance for the test)
    // We will not approve, so transferFrom will fail
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");
    
    // Call transfer with from=owner, caddress=token, tos=recipients, v=amount
    // This should revert because the token contract's transferFrom will fail (no allowance)
    await expect(
      airdrop.transfer(owner.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});