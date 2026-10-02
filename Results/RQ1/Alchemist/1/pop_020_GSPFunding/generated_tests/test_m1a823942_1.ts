import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m1a823942", function () {
  it("should revert when selling more shares than owned (original behavior), mutant should not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract with constructor arguments
    // GSPFunding inherits from GSPVault which inherits from GSPStorage which inherits from ReentrancyGuard
    // The contract doesn't have explicit constructor, so no constructor arguments needed
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Initialize the contract with base and quote tokens
    // We need to create mock ERC20 tokens first
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Transfer some tokens to the contract to simulate initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    await baseToken.transfer(instance.target, initialBase);
    await quoteToken.transfer(instance.target, initialQuote);
    
    // Set the token addresses in the contract (these are internal state variables)
    // We need to use the storage layout to set them, but since we can't directly access storage,
    // we'll simulate by calling the contract's internal functions through the ABI
    // Actually, let's use the contract's initialization through buyShares
    
    // First, we need to set _BASE_TOKEN_ and _QUOTE_TOKEN_ - these are public state variables
    // but they don't have setters. Let's check the contract structure...
    
    // Actually, looking at the contract more carefully, we can use the buyShares function
    // to initialize the pool. Let's fund addr1 with tokens and have them buy shares
    
    // Mint tokens to addr1
    await baseToken.mint(addr1.address, ethers.parseEther("100"));
    await quoteToken.mint(addr1.address, ethers.parseEther("100"));
    
    // Approve the contract to spend addr1's tokens
    await baseToken.connect(addr1).approve(instance.target, ethers.parseEther("100"));
    await quoteToken.connect(addr1).approve(instance.target, ethers.parseEther("100"));
    
    // Transfer tokens to the contract for the first buy
    await baseToken.connect(addr1).transfer(instance.target, ethers.parseEther("50"));
    await quoteToken.connect(addr1).transfer(instance.target, ethers.parseEther("50"));
    
    // Buy shares for addr1 (this will initialize the pool)
    await instance.connect(addr1).buyShares(addr1.address);
    
    // Now addr1 has some shares, let's check their balance
    const addr1Shares = await instance.balanceOf(addr1.address);
    
    // The mutant removes the require check for shareAmount <= _SHARES_[msg.sender]
    // So if we try to sell more shares than addr1 has, the original should revert
    // but the mutant should not
    
    // Calculate more shares than addr1 has
    const excessiveShares = addr1Shares + 1n;
    
    // This call should revert in the original contract (due to the require statement)
    // In the mutant, it should NOT revert (the check is removed)
    await expect(
      instance.connect(addr1).sellShares(
        excessiveShares,
        addr2.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        Math.floor(Date.now() / 1000) + 3600 // deadline (1 hour from now)
      )
    ).to.be.reverted; // This will pass for original, fail for mutant
    
    // For the mutant, we would need to check that the transaction succeeds
    // But since we can't run the actual mutant in this test, we rely on the revert check
  });
});