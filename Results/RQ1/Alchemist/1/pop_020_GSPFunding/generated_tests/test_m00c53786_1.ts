import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m00c53786 - sellShares baseAmount check", function () {
  let owner: any;
  let addr1: any;
  let addr2: any;
  let baseToken: any;
  let quoteToken: any;
  let gspFunding: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    baseToken = await ERC20Factory.deploy("Base Token", "BASE", 18);
    await baseToken.waitForDeployment();
    quoteToken = await ERC20Factory.deploy("Quote Token", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding contract
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    gspFunding = await GSPFundingFactory.deploy();
    await gspFunding.waitForDeployment();

    // Initialize the contract with tokens and initial parameters
    // Set base token, quote token, initial I (price), K (spread), fee rates
    await gspFunding.connect(owner).setBaseToken(baseToken.target);
    await gspFunding.connect(owner).setQuoteToken(quoteToken.target);
    await gspFunding.connect(owner).setI(ethers.parseEther("1")); // 1:1 ratio
    await gspFunding.connect(owner).setK(ethers.parseEther("0.5"));
    await gspFunding.connect(owner).setMtFeeRate(0);
    await gspFunding.connect(owner).setLpFeeRate(0);

    // Fund contract with initial liquidity
    await baseToken.connect(owner).transfer(gspFunding.target, ethers.parseEther("1000"));
    await quoteToken.connect(owner).transfer(gspFunding.target, ethers.parseEther("1000"));
  });

  it("should revert when baseAmount received is less than baseMinAmount (original behavior)", async function () {
    // First, buy shares to become a liquidity provider
    await baseToken.connect(addr1).approve(gspFunding.target, ethers.parseEther("100"));
    await quoteToken.connect(addr1).approve(gspFunding.target, ethers.parseEther("100"));
    await baseToken.connect(addr1).transfer(gspFunding.target, ethers.parseEther("100"));
    await quoteToken.connect(addr1).transfer(gspFunding.target, ethers.parseEther("100"));
    
    await gspFunding.connect(addr1).buyShares(addr1.address);

    // Get the user's share balance
    const shareBalance = await gspFunding.connect(addr1).balanceOf(addr1.address);
    
    // Calculate expected baseAmount from selling shares
    const totalSupply = await gspFunding.totalSupply();
    const baseReserve = await gspFunding._BASE_RESERVE_();
    const expectedBaseAmount = (baseReserve * shareBalance) / totalSupply;
    
    // Set baseMinAmount slightly higher than expected to trigger revert in original
    const baseMinAmountTooHigh = expectedBaseAmount + BigInt(1);
    
    // This should revert in original because baseAmount < baseMinAmount
    // Mutant would allow it (incorrectly) because baseAmount <= baseMinAmount
    await expect(
      gspFunding.connect(addr1).sellShares(
        shareBalance,
        addr1.address,
        baseMinAmountTooHigh,
        0, // quoteMinAmount = 0 (no constraint)
        "0x", // empty data
        Math.floor(Date.now() / 1000) + 3600 // deadline in future
      )
    ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");
  });
});