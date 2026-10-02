import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m2adfd821 test", function () {
  it("should detect the mutant by verifying transfers are executed", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy EBU
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();
    
    // Mint tokens to 'from' address and approve EBU to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(ebu.target, mintAmount);
    
    // Setup transfer parameters
    const recipients = [to.address];
    const amounts = [ethers.parseEther("10")];
    
    // Record balances before
    const balanceBeforeFrom = await token.balanceOf(from.address);
    const balanceBeforeTo = await token.balanceOf(to.address);
    
    // Call transfer on EBU (which calls transferFrom on the token)
    const tx = await ebu.transfer(from.address, token.target, recipients, amounts);
    await tx.wait();
    
    // Check balances after - on original, tokens should transfer; on mutant they won't
    const balanceAfterFrom = await token.balanceOf(from.address);
    const balanceAfterTo = await token.balanceOf(to.address);
    
    expect(balanceAfterFrom).to.equal(balanceBeforeFrom - amounts[0]);
    expect(balanceAfterTo).to.equal(balanceBeforeTo + amounts[0]);
  });
});