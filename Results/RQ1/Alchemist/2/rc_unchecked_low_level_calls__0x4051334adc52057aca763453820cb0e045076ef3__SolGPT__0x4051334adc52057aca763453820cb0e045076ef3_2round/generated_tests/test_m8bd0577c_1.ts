import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should revert when calling transfer with a non-empty _tos array (mutant has i>_tos.length, so loop never executes)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that the airdrop contract will call transferFrom on
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund owner with tokens and approve airdrop to transfer on behalf
    await token.transfer(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await airdrop.getAddress(), ethers.parseEther("100"));
    
    const recipients = [addr1.address, addr2.address];
    const amount = ethers.parseEther("10");
    
    // Before: check balances
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);
    
    // This should revert on the mutant because the loop condition i>_tos.length is false (0 > 2 = false)
    // so no transferFrom calls are made, but the function returns true - however the require(_s) never runs
    // and no transfers happen, so we expect it to NOT revert (but actually the test detects via balance check)
    await airdrop.transfer(owner.address, await token.getAddress(), recipients, amount);
    
    // After: on original, balances would increase; on mutant, they stay the same
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);
    
    // Assert that transfers actually happened (they will NOT on mutant)
    expect(balanceAfter1 - balanceBefore1).to.equal(amount);
    expect(balanceAfter2 - balanceBefore2).to.equal(amount);
  });
});