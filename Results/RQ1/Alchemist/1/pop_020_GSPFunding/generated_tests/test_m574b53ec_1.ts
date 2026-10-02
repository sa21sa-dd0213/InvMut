import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - m574b53ec", function () {
  it("should detect the arithmetic mutant (replacing + with *) in _BASE_TARGET_ update during buyShares", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for base and quote
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await MockERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding - note: constructor may need specific arguments
    // Based on the contract, the constructor is inherited from GSPStorage which calls ReentrancyGuard constructor
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFundingFactory.deploy();
    await gsp.waitForDeployment();

    // Setup initial state: mint tokens to user1 and fund the contract
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("2000");
    await baseToken.mint(user1.address, initialBase);
    await quoteToken.mint(user1.address, initialQuote);
    await baseToken.mint(gsp.target, initialBase);
    await quoteToken.mint(gsp.target, initialQuote);

    // Initialize the GSP by setting base/quote tokens and initial reserves
    // The contract has _BASE_TOKEN_ and _QUOTE_TOKEN_ which need to be set
    // We need to call the initialization function if exists, or set via storage
    // Since the contract doesn't have an explicit init function visible, we'll need to set the token addresses
    // and initial reserves by calling the appropriate setters or using the contract's internal mechanism
    // For testing purposes, we'll directly set the storage via hardhat's setStorageAt or use the contract's functions
    
    // First buyShares to initialize the pool (totalSupply == 0 case)
    // Transfer tokens to contract so buyShares can detect them
    await baseToken.connect(user1).transfer(gsp.target, ethers.parseEther("100"));
    await quoteToken.connect(user1).transfer(gsp.target, ethers.parseEther("100"));
    
    // Call buyShares - this will trigger the first branch where totalSupply == 0
    await gsp.connect(user1).buyShares(user1.address);
    
    // Get initial state after first buy
    const state1 = await gsp.getPMMState();
    const totalSupply1 = await gsp.totalSupply();
    const baseTarget1 = state1.B0;
    const baseReserve1 = state1.B;
    
    // Now do a second buyShares to trigger the else-if branch (baseReserve > 0 && quoteReserve > 0)
    // This is where the mutant lives - in the _BASE_TARGET_ update
    await baseToken.connect(user1).transfer(gsp.target, ethers.parseEther("50"));
    await quoteToken.connect(user1).transfer(gsp.target, ethers.parseEther("50"));
    
    // Store state before second buyShares
    const stateBefore = await gsp.getPMMState();
    const baseTargetBefore = stateBefore.B0;
    const baseReserveBefore = stateBefore.B;
    
    // Call buyShares - this will execute the mutated code path
    await gsp.connect(user1).buyShares(user1.address);
    
    // Get state after second buyShares
    const stateAfter = await gsp.getPMMState();
    const baseTargetAfter = stateAfter.B0;
    const baseReserveAfter = stateAfter.B;
    
    // The original code would: baseTarget = baseTarget + (baseTarget * mintRatio / 1e18)
    // The mutant does: baseTarget = baseTarget * (baseTarget * mintRatio / 1e18)
    // For the mutant, if mintRatio is say 0.05 (5%), the multiplication would produce:
    // baseTarget * (baseTarget * 0.05) which is hugely inflated compared to addition
    // So baseTargetAfter should be astronomically large in the mutant case
    
    // Calculate what the original code would produce
    const mintRatio = (ethers.parseEther("50") * ethers.parseEther("1")) / baseReserveBefore; // simplified
    // Expected baseTargetOriginal = baseTargetBefore + (baseTargetBefore * mintRatio / 1e18)
    
    // The mutant would produce baseTargetMutant = baseTargetBefore * (baseTargetBefore * mintRatio / 1e18)
    // This is approximately baseTargetBefore^2 * mintRatio / 1e18 which is enormous
    
    // Assert that the baseTargetAfter is NOT astronomically large (which would indicate the mutant)
    // In the original, baseTargetAfter should be slightly larger than baseTargetBefore
    // In the mutant, it would be orders of magnitude larger
    const maxExpectedTarget = baseTargetBefore + (baseTargetBefore * ethers.parseEther("0.1") / ethers.parseEther("1")); // at most 10% increase
    expect(baseTargetAfter).to.be.lte(maxExpectedTarget);
    
    // Additionally, verify that the total supply increased reasonably
    const totalSupplyAfter = await gsp.totalSupply();
    expect(totalSupplyAfter).to.be.gt(totalSupply1);
    
    // Test sellShares to verify the pool math is correct
    const user1Shares = await gsp.balanceOf(user1.address);
    const baseMin = 0;
    const quoteMin = 0;
    
    // Sell shares should work and return reasonable amounts
    await expect(
      gsp.connect(user1).sellShares(
        user1Shares,
        user1.address,
        baseMin,
        quoteMin,
        "0x",
        Math.floor(Date.now() / 1000) + 3600
      )
    ).to.not.be.reverted;
    
    // If the mutant was active, the sellShares would either revert due to overflow
    // or return incorrect amounts (likely very small due to inflated targets)
  });
});

// Helper mock contract for testing
// Note: In a real test environment, you'd deploy actual ERC20 tokens
// For this test we assume MockERC20 exists with mint function