import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - mff50f4ac", function () {
  it("should revert when selling shares with expired deadline", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the GSPFunding contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Need to initialize the contract with base and quote tokens
    // First deploy mock ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Initialize the GSPFunding contract with tokens
    // Note: This requires the proper initialization function calls based on the contract
    
    // First, transfer tokens to the contract to have reserves
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("1000");
    
    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);
    
    // Call buyShares to create initial liquidity and mint shares
    await instance.connect(addr1).buyShares(addr1.address);
    
    // Get current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block.timestamp;
    
    // Now test the mutant: call sellShares with expired deadline (past timestamp)
    const shareAmount = ethers.parseEther("1");
    const baseMinAmount = 0;
    const quoteMinAmount = 0;
    const expiredDeadline = currentTimestamp - 1; // Deadline in the past
    const data = "0x";
    
    // This should revert on the original contract with "TIME_EXPIRED"
    // but should pass on the mutant (since the check is removed)
    await expect(
      instance.connect(addr1).sellShares(
        shareAmount,
        addr2.address,
        baseMinAmount,
        quoteMinAmount,
        data,
        expiredDeadline
      )
    ).to.be.revertedWith("TIME_EXPIRED");
  });
});