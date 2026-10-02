import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m980437ad - sellShares quoteAmount check", function () {
  it("should revert when quoteAmount is less than quoteMinAmount (mutant uses <= instead of >=)", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockToken.deploy("Base", "BASE", 18);
    const quoteToken = await MockToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFundingFactory.deploy();
    await gsp.waitForDeployment();

    // Initialize the contract (set tokens, initial prices, etc.)
    // First set the base and quote tokens
    await gsp.setBaseToken(await baseToken.getAddress());
    await gsp.setQuoteToken(await quoteToken.getAddress());

    // Set initial parameters
    const INITIAL_I = ethers.parseEther("1"); // 1:1 ratio
    const INITIAL_K = ethers.parseEther("0.5");
    await gsp.setParameters(INITIAL_I, INITIAL_K);

    // Mint initial liquidity to user1
    const INITIAL_BASE = ethers.parseEther("1000");
    const INITIAL_QUOTE = ethers.parseEther("1000");

    await baseToken.mint(user1.address, INITIAL_BASE);
    await quoteToken.mint(user1.address, INITIAL_QUOTE);

    // User1 provides initial liquidity
    await baseToken.connect(user1).approve(await gsp.getAddress(), INITIAL_BASE);
    await quoteToken.connect(user1).approve(await gsp.getAddress(), INITIAL_QUOTE);
    await gsp.connect(user1).deposit(INITIAL_BASE, INITIAL_QUOTE);

    // User1 buys shares
    await baseToken.mint(owner.address, ethers.parseEther("500"));
    await quoteToken.mint(owner.address, ethers.parseEther("500"));
    await baseToken.connect(owner).approve(await gsp.getAddress(), ethers.parseEther("500"));
    await quoteToken.connect(owner).approve(await gsp.getAddress(), ethers.parseEther("500"));
    await gsp.connect(owner).buyShares(owner.address);

    // Get user1's share balance
    const user1Shares = await gsp.balanceOf(user1.address);

    // Calculate expected quote amount when selling shares
    const totalSupply = await gsp.totalSupply();
    const quoteReserve = await gsp._QUOTE_RESERVE_();
    const mtFeeQuote = await gsp._MT_FEE_QUOTE_();
    const quoteBalance = await quoteToken.balanceOf(await gsp.getAddress()) - mtFeeQuote;
    const expectedQuoteAmount = (quoteBalance * user1Shares) / totalSupply;

    // Set quoteMinAmount higher than expected quoteAmount to trigger the mutant bug
    // The mutant uses <=, so it would allow when quoteAmount <= quoteMinAmount
    // We want quoteAmount < quoteMinAmount, so the original should revert
    const quoteMinAmountTooHigh = expectedQuoteAmount + ethers.parseEther("1");
    const baseMinAmount = ethers.parseEther("0");

    // This should revert in the original (and the mutant should fail because it allows it)
    await expect(
      gsp.connect(user1).sellShares(
        user1Shares,
        user2.address,
        baseMinAmount,
        quoteMinAmountTooHigh,
        "0x",
        9999999999
      )
    ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");

    // Verify that with correct quoteMinAmount it works
    const quoteMinAmountCorrect = expectedQuoteAmount;
    await expect(
      gsp.connect(user1).sellShares(
        user1Shares,
        user2.address,
        baseMinAmount,
        quoteMinAmountCorrect,
        "0x",
        9999999999
      )
    ).to.not.be.reverted;
  });
});