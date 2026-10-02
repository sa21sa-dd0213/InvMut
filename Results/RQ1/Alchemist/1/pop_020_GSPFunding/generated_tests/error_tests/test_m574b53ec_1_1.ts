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

    // Deploy GSPFunding
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

    // First buyShares to initialize the pool (totalSupply == 0 case)
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

    // Calculate what the original code would produce
    const mintRatio = (ethers.parseEther("50") * ethers.parseEther("1")) / baseReserveBefore;
    
    // Assert that the baseTargetAfter is NOT astronomically large (which would indicate the mutant)
    const maxExpectedTarget = baseTargetBefore + (baseTargetBefore * ethers.parseEther("0.1") / ethers.parseEther("1"));
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
  });
});