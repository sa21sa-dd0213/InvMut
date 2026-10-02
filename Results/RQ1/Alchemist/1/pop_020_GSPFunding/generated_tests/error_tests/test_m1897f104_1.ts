import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - deadline check", function () {
  it("should revert when deadline is in the future on mutant (deadline <= block.timestamp)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GSPFunding - note: the contract has no constructor, but we need to initialize it
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: need to have base and quote tokens, mint shares, etc.
    // For this test we need to have shares to sell, so first buy some shares
    // First we need to set up the tokens - we'll use the contract's own token addresses
    // In a real scenario these would be deployed separately, but for testing we'll use mock tokens
    
    // Since the contract requires _BASE_TOKEN_ and _QUOTE_TOKEN_ to be set,
    // we need to deploy ERC20 tokens and set them
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // We need to set the tokens in the GSPFunding contract
    // This requires calling internal functions - we'll use the storage directly
    // For simplicity, let's focus on testing the deadline check directly
    
    // The key test: call sellShares with a future deadline
    // This should pass on original (deadline >= block.timestamp) but fail on mutant (deadline <= block.timestamp)
    
    // Set a deadline 1 hour in the future
    const futureDeadline = Math.floor(Date.now() / 1000) + 3600;
    
    // Try to call sellShares - it will fail because we don't have shares,
    // but the deadline check happens first, so we can test the revert reason
    await expect(
      instance.connect(addr1).sellShares(
        100,           // shareAmount
        addr2.address, // to
        0,             // baseMinAmount
        0,             // quoteMinAmount
        "0x",          // data
        futureDeadline // deadline in the future
      )
    ).to.be.revertedWith("GLP_NOT_ENOUGH"); // This should pass on original, but on mutant it would revert with "TIME_EXPIRED"
    
    // If we get "GLP_NOT_ENOUGH", the deadline check passed (original behavior)
    // If we get "TIME_EXPIRED", the mutant is detected
  });
});