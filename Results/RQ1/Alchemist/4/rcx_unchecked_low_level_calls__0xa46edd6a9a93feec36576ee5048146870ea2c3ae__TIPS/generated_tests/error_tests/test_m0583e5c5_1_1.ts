import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - keccak256 replaced with sha256", function () {
  it("should detect mutant by verifying correct function selector is used for transferFrom", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();
    
    // Deploy a simple token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Approve EBU contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);
    
    // Prepare transfer parameters
    const tos = [to.address];
    const amounts = [ethers.parseEther("10")];
    
    // Get balances before
    const balanceFromBefore = await token.balanceOf(from.address);
    const balanceToBefore = await token.balanceOf(to.address);
    
    // Call transfer on EBU
    const tx = await ebu.connect(owner).transfer(from.address, await token.getAddress(), tos, amounts);
    await tx.wait();
    
    // Get balances after
    const balanceFromAfter = await token.balanceOf(from.address);
    const balanceToAfter = await token.balanceOf(to.address);
    
    // Verify the transfer happened correctly
    // If keccak256 was used (original), transferFrom would execute correctly
    // If sha256 was used (mutant), the wrong selector would be computed and transfer would fail
    expect(balanceFromAfter).to.equal(balanceFromBefore - ethers.parseEther("10"));
    expect(balanceToAfter).to.equal(balanceToBefore + ethers.parseEther("10"));
  });
});