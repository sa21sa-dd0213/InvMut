import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m1207c101 - kill mutant", function () {
  it("should revert when selling exact share balance (mutant uses < instead of <=)", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy contract - note: GSPFunding constructor requires no arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Initialize the contract state to allow share minting
    // We need base and quote tokens - deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();
    
    // Transfer tokens to the GSPFunding contract and initialize
    await baseToken.mint(owner.address, ethers.parseEther("1000"));
    await quoteToken.mint(owner.address, ethers.parseEther("1000"));
    await baseToken.approve(instance.target, ethers.parseEther("1000"));
    await quoteToken.approve(instance.target, ethers.parseEther("1000"));
    
    // Initialize the GSP pool (requires setting initial reserves)
    // First buy shares to create initial liquidity
    await instance.connect(owner).buyShares(owner.address, {
      value: 0
    });
    
    // Transfer some shares to user1 for testing
    const sharesToTransfer = ethers.parseEther("100");
    await instance.connect(owner).transfer(user1.address, sharesToTransfer);
    
    // Verify user1 has exactly the transferred shares
    const userBalance = await instance.balanceOf(user1.address);
    expect(userBalance).to.equal(sharesToTransfer);
    
    // Attempt to sell the exact amount of shares user1 owns
    // This should pass on original (<=) but revert on mutant (<)
    await expect(
      instance.connect(user1).sellShares(
        sharesToTransfer, // shareAmount = exact balance
        user1.address,    // to
        0,               // baseMinAmount
        0,               // quoteMinAmount
        "0x",            // data
        Math.floor(Date.now() / 1000) + 3600 // deadline
      )
    ).to.be.revertedWith("GLP_NOT_ENOUGH");
  });
});