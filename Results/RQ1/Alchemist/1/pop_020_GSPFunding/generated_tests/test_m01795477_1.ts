import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - m01795477", function () {
  it("should kill mutant by selling shares with _BASE_TARGET_ > 1 and shareAmount > 1", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy GSPFunding (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy mock ERC20 tokens for BASE and QUOTE
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Initialize the GSP contract with tokens
    await instance.connect(owner)._BASE_TOKEN_.set(baseToken.target);
    await instance.connect(owner)._QUOTE_TOKEN_.set(quoteToken.target);
    
    // Mint tokens to user1
    await baseToken.mint(user1.address, ethers.parseEther("10000"));
    await quoteToken.mint(user1.address, ethers.parseEther("10000"));
    
    // User1 approves and buys shares to initialize liquidity
    await baseToken.connect(user1).approve(instance.target, ethers.parseEther("10000"));
    await quoteToken.connect(user1).approve(instance.target, ethers.parseEther("10000"));
    
    // Transfer tokens to contract to simulate initial deposit
    await baseToken.connect(user1).transfer(instance.target, ethers.parseEther("5000"));
    await quoteToken.connect(user1).transfer(instance.target, ethers.parseEther("5000"));
    
    // Buy shares (initial mint)
    await instance.connect(user1).buyShares(user1.address);
    
    // Now we need to set _BASE_TARGET_ to a value > 1 and have shares > 1
    // Get current state
    const baseTarget = await instance._BASE_TARGET_();
    const shares = await instance._SHARES_(user1.address);
    
    // Ensure baseTarget > 1 and shares > 1 for the test
    expect(baseTarget).to.be.gt(1);
    expect(shares).to.be.gt(1);
    
    // Sell shares with shareAmount > 1
    // This will trigger the mutated line: uint256(_BASE_TARGET_) ** (shareAmount)
    // which will produce an astronomically large number causing revert or incorrect state
    const sellAmount = shares / 2n; // Ensure > 1
    
    await expect(
      instance.connect(user1).sellShares(
        sellAmount,
        user1.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        (await ethers.provider.getBlock("latest")).timestamp + 1000 // deadline
      )
    ).to.be.reverted; // The exponentiation should cause a revert due to overflow or incorrect math
  });
});