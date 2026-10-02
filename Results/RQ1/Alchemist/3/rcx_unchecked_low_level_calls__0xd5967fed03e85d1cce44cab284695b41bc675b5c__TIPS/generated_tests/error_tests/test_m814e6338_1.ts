import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m814e6338", function () {
  it("should detect mutant that changed < to > in loop condition by verifying transferFrom is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like contract to test transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();
    
    // Deploy the demo contract (no constructor args)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Setup: mint tokens to owner, approve demo contract to spend
    const mintAmount = ethers.parseEther("100");
    const transferAmount = ethers.parseEther("10");
    await token.mint(owner.address, mintAmount);
    await token.approve(await demo.getAddress(), mintAmount);
    
    // Record balances before
    const balanceBeforeOwner = await token.balanceOf(owner.address);
    const balanceBeforeAddr1 = await token.balanceOf(addr1.address);
    
    // Call transfer with one recipient address
    const recipients = [addr1.address];
    const tx = await demo.transfer(owner.address, await token.getAddress(), recipients, transferAmount);
    await tx.wait();
    
    // Check balances after - if loop condition is mutated (i > length), no transfer happens
    const balanceAfterOwner = await token.balanceOf(owner.address);
    const balanceAfterAddr1 = await token.balanceOf(addr1.address);
    
    // In original contract, owner loses tokens, addr1 gains tokens
    expect(balanceAfterOwner).to.equal(balanceBeforeOwner - transferAmount);
    expect(balanceAfterAddr1).to.equal(balanceBeforeAddr1 + transferAmount);
  });
});