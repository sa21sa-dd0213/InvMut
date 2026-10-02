import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should detect mutant by verifying token transfers actually occur for multiple recipients", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund owner with tokens and approve airdrop contract to spend
    const amount = ethers.parseEther("100");
    await token.mint(owner.address, amount);
    await token.approve(await airdrop.getAddress(), amount);
    
    // Record balances before transfer
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);
    
    // Call transfer with two recipients
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");
    await airdrop.transfer(owner.address, await token.getAddress(), recipients, transferAmount);
    
    // Verify both recipients received tokens
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);
    
    expect(balanceAfter1 - balanceBefore1).to.equal(transferAmount);
    expect(balanceAfter2 - balanceBefore2).to.equal(transferAmount);
  });
});