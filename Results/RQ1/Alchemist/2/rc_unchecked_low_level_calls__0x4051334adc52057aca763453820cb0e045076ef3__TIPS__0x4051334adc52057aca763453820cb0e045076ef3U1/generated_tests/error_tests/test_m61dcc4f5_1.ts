import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airdrop mutant m61dcc4f5 test", function () {
  it("should detect keccak256 to sha256 mutation by verifying correct function selector is used", async function () {
    const [owner, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token to test with
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Give owner some tokens and approve the airdrop contract
    await token.approve(owner.address, ethers.parseEther("100"));
    
    // Deploy the airdrop contract (no constructor args)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Fund the airdrop contract with tokens to transfer
    await token.transfer(await airdrop.getAddress(), ethers.parseEther("10"));
    
    // Capture balance before transfer
    const balanceBefore = await token.balanceOf(recipient.address);
    
    // Call transfer with the token contract, recipient array, and amount
    const tx = await airdrop.transfer(
      owner.address,
      await token.getAddress(),
      [recipient.address],
      ethers.parseEther("1")
    );
    await tx.wait();
    
    // Check recipient balance - original would succeed, mutant would fail
    const balanceAfter = await token.balanceOf(recipient.address);
    
    // The original contract would successfully transfer, mutant would not
    // because sha256 produces wrong selector
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("1"));
  });
});