import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - sellShares partial sell", function () {
  it("should allow selling a portion of shares (not all) and kill mutant that requires exact balance", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy GSPFunding - note: this contract has no constructor, so no args needed
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Need to initialize the pool with base and quote tokens
    // Deploy mock ERC20 tokens for base and quote
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();
    
    // Fund user with tokens
    const initialMint = ethers.parseEther("10000");
    await baseToken.mint(user.address, initialMint);
    await quoteToken.mint(user.address, initialMint);
    
    // User approves GSPFunding to spend tokens
    await baseToken.connect(user).approve(instance.target, initialMint);
    await quoteToken.connect(user).approve(instance.target, initialMint);
    
    // Set base and quote tokens in GSPFunding
    await instance.setBaseToken(baseToken.target);
    await instance.setQuoteToken(quoteToken.target);
    
    // User provides initial liquidity to get shares
    await baseToken.connect(user).transfer(instance.target, ethers.parseEther("5000"));
    await quoteToken.connect(user).transfer(instance.target, ethers.parseEther("5000"));
    
    // Call buyShares to mint shares to user
    await instance.connect(user).buyShares(user.address);
    
    // Get user's share balance
    const userShares = await instance.balanceOf(user.address);
    expect(userShares).to.be.gt(0);
    
    // User sells a portion of their shares (not all)
    const partialShares = userShares / 2n; // Sell half of shares
    
    // This should succeed on original (partial sell allowed) 
    // but fail on mutant (requires exact balance)
    await expect(
      instance.connect(user).sellShares(
        partialShares,
        user.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        ethers.MaxUint256 // deadline
      )
    ).to.not.be.reverted;
    
    // Verify shares were burned
    const remainingShares = await instance.balanceOf(user.address);
    expect(remainingShares).to.equal(userShares - partialShares);
  });
});