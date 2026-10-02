import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test for m691c286a", function () {
  it("should kill mutant by verifying quote target is reduced via subtraction not division", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding with required constructor args
    // Constructor: GSPFunding(address maintainer, address baseToken, address quoteToken, uint256 lpFeeRate, uint256 mtFeeRate, uint256 i, uint256 k)
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFunding.deploy(
      owner.address,
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("0.001"), // lpFeeRate 0.1%
      ethers.parseEther("0.0005"), // mtFeeRate 0.05%
      ethers.parseEther("1"), // i = 1 (1:1 price)
      ethers.parseEther("0.5") // k = 0.5
    );
    await gsp.waitForDeployment();
    
    // Mint tokens and approve
    const baseAmount = ethers.parseEther("10000");
    const quoteAmount = ethers.parseEther("10000");
    
    await baseToken.mint(owner.address, baseAmount);
    await quoteToken.mint(owner.address, quoteAmount);
    
    await baseToken.approve(await gsp.getAddress(), baseAmount);
    await quoteToken.approve(await gsp.getAddress(), quoteAmount);
    
    // Transfer tokens to GSP to simulate initial liquidity
    await baseToken.transfer(await gsp.getAddress(), baseAmount);
    await quoteToken.transfer(await gsp.getAddress(), quoteAmount);
    
    // Buy shares to initialize the pool
    await gsp.buyShares(owner.address);
    
    // Get initial state after first buy
    let state = await gsp.getPMMStateForCall();
    const initialQuoteTarget = state.Q0;
    const initialTotalSupply = await gsp.totalSupply();
    
    // Transfer more tokens to increase reserves
    const extraBase = ethers.parseEther("5000");
    const extraQuote = ethers.parseEther("5000");
    await baseToken.mint(owner.address, extraBase);
    await quoteToken.mint(owner.address, extraQuote);
    await baseToken.transfer(await gsp.getAddress(), extraBase);
    await quoteToken.transfer(await gsp.getAddress(), extraQuote);
    
    // Buy more shares
    await gsp.buyShares(owner.address);
    
    // Get state after second buy
    state = await gsp.getPMMStateForCall();
    const midBuyQuoteTarget = state.Q0;
    const totalSupplyAfterBuy = await gsp.totalSupply();
    
    // Sell half the shares
    const sharesToSell = totalSupplyAfterBuy / 2n;
    
    // Calculate expected quote target after selling shares (original behavior)
    const expectedQuoteTargetReduction = ethers.parseEther(
      (Number(ethers.formatEther(midBuyQuoteTarget)) * Number(ethers.formatEther(sharesToSell)) / Number(ethers.formatEther(totalSupplyAfterBuy))).toString()
    );
    
    // Approve shares for transfer (not needed for sell, but ensure user has shares)
    // Actually owner already has shares, just call sellShares
    await gsp.sellShares(
      sharesToSell,
      owner.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );
    
    // Get state after selling
    state = await gsp.getPMMStateForCall();
    const finalQuoteTarget = state.Q0;
    
    // The mutant divides instead of subtracts
    // Expected with original: finalQuoteTarget = midBuyQuoteTarget - expectedQuoteTargetReduction
    // Expected with mutant: finalQuoteTarget = midBuyQuoteTarget / expectedQuoteTargetReduction
    // For typical values, division gives much smaller result
    // We verify that the result is consistent with subtraction, not division
    
    // Calculate what subtraction would give
    const expectedWithSubtraction = midBuyQuoteTarget - expectedQuoteTargetReduction;
    
    // Calculate what division would give (the mutant behavior)
    const expectedWithDivision = midBuyQuoteTarget / expectedQuoteTargetReduction;
    
    // Assert that actual result matches subtraction (original behavior)
    // The mutant would produce a value close to expectedWithDivision which is much smaller
    expect(finalQuoteTarget).to.be.closeTo(
      expectedWithSubtraction,
      ethers.parseEther("0.01") // small tolerance for rounding
    );
    
    // Additional assertion to confirm mutant is killed
    // If mutant were active, finalQuoteTarget would be extremely small (division result)
    // So we assert it's NOT the division result
    expect(finalQuoteTarget).to.not.equal(expectedWithDivision);
  });
});