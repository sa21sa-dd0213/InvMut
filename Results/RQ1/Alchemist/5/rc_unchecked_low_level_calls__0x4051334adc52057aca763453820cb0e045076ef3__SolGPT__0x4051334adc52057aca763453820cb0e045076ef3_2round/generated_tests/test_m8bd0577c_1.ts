import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c detection", function () {
  it("should detect mutant that changes < to > in loop condition", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token to test transferFrom
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the airdrop contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Deploy the airdrop contract
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Approve airdrop contract to spend tokens from 'from'
    const approveAmount = ethers.parseEther("10");
    await token.connect(from).approve(await instance.getAddress(), approveAmount);
    
    // Capture balances before transfer
    const balanceBefore = await token.balanceOf(recipient.address);
    
    // Call transfer with a non-empty array
    const transferValue = ethers.parseEther("5");
    const recipients = [recipient.address];
    await instance.transfer(from.address, await token.getAddress(), recipients, transferValue);
    
    // Assert that tokens were actually transferred (mutant fails to execute loop, so balance unchanged)
    const balanceAfter = await token.balanceOf(recipient.address);
    expect(balanceAfter).to.equal(balanceBefore + transferValue);
  });
});