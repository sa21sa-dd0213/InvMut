import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m1035418b test", function () {
  it("should emit SellShares event when sellShares is called, mutant removes event emission", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy GSPFunding - note: constructor arguments may be required
    // Based on the contract code, the constructor is inherited from ReentrancyGuard which has no arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Need to initialize the pool with some tokens
    // Deploy mock ERC20 tokens for base and quote
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Mint tokens to owner and transfer to contract to simulate initial liquidity
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    await baseToken.mint(owner.address, baseAmount);
    await quoteToken.mint(owner.address, quoteAmount);
    await baseToken.transfer(instance.target, baseAmount);
    await quoteToken.transfer(instance.target, quoteAmount);
    
    // Set initial reserves and targets via storage manipulation or appropriate setup
    // Since we can't directly set storage, we need to call buyShares to initialize
    // First set the tokens in the contract
    await instance.connect(owner)._setBaseToken(baseToken.target);
    await instance.connect(owner)._setQuoteToken(quoteToken.target);
    
    // Set initial I and K values
    // Note: These are internal variables that might need initialization
    // For testing, we'll call buyShares to create initial shares
    // Buy shares to initialize the pool
    const tx = await instance.connect(owner).buyShares(owner.address);
    await tx.wait();
    
    // Now transfer some more tokens to get quoteInput for selling shares
    const sellAmount = ethers.parseEther("100");
    await baseToken.mint(owner.address, sellAmount);
    await baseToken.transfer(instance.target, sellAmount);
    await quoteToken.mint(owner.address, sellAmount);
    await quoteToken.transfer(instance.target, sellAmount);
    
    // Call sync to update reserves
    await instance.connect(owner).sync();
    
    // Get total supply and calculate share amount to sell
    const totalSupply = await instance.totalSupply();
    const shareAmount = totalSupply / 10n; // Sell 10% of shares
    
    // Approve transfer of shares (if needed)
    // The sellShares function burns from msg.sender, no approval needed
    
    // Sell shares and expect SellShares event
    await expect(
      instance.connect(owner).sellShares(
        shareAmount,
        addr1.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        ethers.MaxUint256 // deadline
      )
    ).to.emit(instance, "SellShares")
     .withArgs(owner.address, addr1.address, shareAmount, await instance.connect(owner).balanceOf(owner.address));
  });
});