import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m1a823942", function () {
  it("should revert when selling more shares than owned (original behavior), mutant should not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens first
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy the GSPFunding contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract by setting token addresses through storage manipulation
    // Since we can't call internal functions directly, we need to interact through buyShares
    // First, fund addr1 with tokens
    await baseToken.mint(addr1.address, ethers.parseEther("100"));
    await quoteToken.mint(addr1.address, ethers.parseEther("100"));

    // Approve the contract to spend addr1's tokens
    await baseToken.connect(addr1).approve(instance.target, ethers.parseEther("100"));
    await quoteToken.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Transfer tokens to the contract to provide initial liquidity
    await baseToken.connect(addr1).transfer(instance.target, ethers.parseEther("50"));
    await quoteToken.connect(addr1).transfer(instance.target, ethers.parseEther("50"));

    // Set the token addresses directly (they are public state variables)
    // We need to set _BASE_TOKEN_ and _QUOTE_TOKEN_ 
    // This requires direct storage access which is complex; instead let's use buyShares which will set them
    // Actually, the contract requires _BASE_TOKEN_ and _QUOTE_TOKEN_ to be set before buyShares works
    // Let's check if we can set them through the contract's initialization
    
    // Since we can't directly set the token addresses, we need to deploy with them already set
    // For testing purposes, let's use a different approach - we'll use the contract's storage directly
    // But this is not possible in Hardhat without special tools
    
    // Alternative: Let's just test the sellShares function directly with a contract that has been initialized
    // Since the test requires the mutant to remove the check, we'll test the require statement
    
    // Buy shares to initialize the pool and set token addresses
    await instance.connect(addr1).buyShares(addr1.address);

    // Now addr1 has some shares, check balance
    const addr1Shares = await instance.balanceOf(addr1.address);

    // Calculate more shares than addr1 has
    const excessiveShares = addr1Shares + 1n;

    // This should revert in the original contract due to require(shareAmount <= _SHARES_[msg.sender])
    await expect(
      instance.connect(addr1).sellShares(
        excessiveShares,
        addr2.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        Math.floor(Date.now() / 1000) + 3600 // deadline (1 hour from now)
      )
    ).to.be.reverted;
  });
});