import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant kill test - revert removal", function () {
  it("should revert when a transferFrom call fails, killing mutant that silently continues", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));
    
    // Approve EBU contract to spend from 'from' address
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("50"));
    
    // Prepare addresses and values - second transfer should fail (insufficient allowance)
    const recipients = [to1.address, to2.address];
    const amounts = [
      ethers.parseEther("10"),
      ethers.parseEther("100")  // This exceeds remaining allowance (40 tokens left)
    ];
    
    // The original contract should revert on the second failed transfer
    // The mutant should NOT revert and return true instead
    await expect(
      instance.transfer(from.address, await token.getAddress(), recipients, amounts)
    ).to.be.reverted;
  });
});