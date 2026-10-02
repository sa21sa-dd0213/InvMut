import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m152d9a92 test", function () {
  it("should kill mutant by triggering the else-if branch with positive reserves", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Mint tokens to owner for initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("2000");
    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);
    
    // Deploy GSPFunding with required constructor arguments
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const constructorArgs = [
      baseToken.target,
      quoteToken.target,
      100,  // _MT_FEE_RATE_ (0.01%)
      1000, // _LP_FEE_RATE_ (0.1%)
      2,    // _K_ (0.000000000000000002)
      ethers.parseEther("1"), // _I_ (initial price)
      ethers.parseEther("1"), // _BASE_TARGET_
      ethers.parseEther("1"), // _QUOTE_TARGET_
      0     // _RState_ (ONE)
    ];
    const gsp = await GSPFundingFactory.deploy(...constructorArgs);
    await gsp.waitForDeployment();
    
    // Transfer tokens to GSP contract for initial reserves
    await baseToken.transfer(gsp.target, initialBase);
    await quoteToken.transfer(gsp.target, initialQuote);
    
    // First buyShares to set up initial reserves and mint shares
    await gsp.connect(owner).buyShares(owner.address);
    
    // Get current state after first buy
    const vaultReserveBefore = await gsp.getVaultReserve();
    const baseReserveBefore = vaultReserveBefore.baseReserve;
    const quoteReserveBefore = vaultReserveBefore.quoteReserve;
    
    // Verify both reserves are positive (>0)
    expect(baseReserveBefore).to.be.gt(0);
    expect(quoteReserveBefore).to.be.gt(0);
    
    // Now user1 provides additional liquidity to trigger the else-if branch
    const additionalBase = ethers.parseEther("100");
    const additionalQuote = ethers.parseEther("200");
    await baseToken.mint(user1.address, additionalBase);
    await quoteToken.mint(user1.address, additionalQuote);
    await baseToken.connect(user1).transfer(gsp.target, additionalBase);
    await quoteToken.connect(user1).transfer(gsp.target, additionalQuote);
    
    // This call should fail on mutant because condition baseReserve < 0 is always false
    // On original, it should succeed
    await expect(
      gsp.connect(user1).buyShares(user1.address)
    ).to.not.be.reverted;
    
    // Verify shares were minted correctly (mutant would fail here)
    const user1Shares = await gsp.balanceOf(user1.address);
    expect(user1Shares).to.be.gt(0);
    
    // Verify reserves updated
    const vaultReserveAfter = await gsp.getVaultReserve();
    expect(vaultReserveAfter.baseReserve).to.be.gt(baseReserveBefore);
    expect(vaultReserveAfter.quoteReserve).to.be.gt(quoteReserveBefore);
  });
});