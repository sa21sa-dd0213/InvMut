import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m21d11e4b test", function () {
  it("should detect mutant that changes >= to > in quoteMinAmount check", async function () {
    const [owner, user1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const BaseToken = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await BaseToken.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();

    const QuoteToken = await ethers.getContractFactory("ERC20Mock");
    const quoteToken = await QuoteToken.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with required constructor arguments
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFunding.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      0, // _I_ (initial price)
      0, // _K_
      0, // _LP_FEE_RATE_
      0, // _MT_FEE_RATE_
      owner.address // _MAINTAINER_
    );
    await gsp.waitForDeployment();

    // Fund the contract with tokens
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    await baseToken.transfer(await gsp.getAddress(), initialBase);
    await quoteToken.transfer(await gsp.getAddress(), initialQuote);

    // Initialize reserves and targets
    await gsp._setReserve(initialBase, initialQuote);
    await gsp._setTarget(initialBase, initialQuote);

    // Mint shares to user1 so they can sell
    await gsp.connect(user1).buyShares(user1.address, { value: ethers.parseEther("10") });

    // Get the current quote balance and calculate exact quoteAmount
    const quoteBalance = await quoteToken.balanceOf(await gsp.getAddress());
    const totalShares = await gsp.totalSupply();
    const shareAmount = ethers.parseEther("1");
    const expectedQuoteAmount = (quoteBalance * shareAmount) / totalShares;

    // Set quoteMinAmount to exactly the expected quoteAmount
    const baseMinAmount = 0;
    const quoteMinAmount = expectedQuoteAmount;

    // This should succeed on original (>=) but fail on mutant (>)
    await expect(
      gsp.connect(user1).sellShares(
        shareAmount,
        user1.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        9999999999
      )
    ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");
  });
});