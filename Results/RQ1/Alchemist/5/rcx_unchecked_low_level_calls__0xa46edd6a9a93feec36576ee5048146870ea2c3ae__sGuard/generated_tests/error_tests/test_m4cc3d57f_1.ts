import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m4cc3d57f", function () {
  it("should detect the mutant where loop condition is changed from < to >", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 mock to use as the token contract
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the 'from' address and approve the EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Deploy EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();
    
    // Setup: from approves EBU to spend tokens
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);
    
    // Prepare transfer parameters
    const recipients = [recipient.address];
    const amounts = [ethers.parseEther("10")];
    
    // Capture balances before transfer
    const balanceBefore = await token.balanceOf(recipient.address);
    
    // Call transfer function
    await ebu.connect(owner).transfer(from.address, await token.getAddress(), recipients, amounts);
    
    // Check recipient balance - should remain unchanged in the mutant (loop never executes)
    const balanceAfter = await token.balanceOf(recipient.address);
    
    // In the original, balance would increase; in the mutant, it stays the same
    expect(balanceAfter).to.equal(balanceBefore);
  });
});