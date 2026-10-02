import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant me58e7767 - kill buyShares with subtraction", function () {
  it("should detect mutant by verifying _BASE_TARGET_ increases after buyShares when pool has existing liquidity", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GSPFunding - Note: The contract has no constructor, so we deploy without arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Initialize the GSPFunding contract
    // Set base and quote tokens
    await instance.connect(owner).setBaseToken(baseTokenAddress);
    await instance.connect(owner).setQuoteToken(quoteTokenAddress);

    // Mint tokens to owner
    const initialBase = ethers.parseEther("10000");
    const initialQuote = ethers.parseEther("20000");
    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);

    // Approve GSPFunding to spend tokens
    await baseToken.connect(owner).approve(instanceAddress, initialBase);
    await quoteToken.connect(owner).approve(instanceAddress, initialQuote);

    // First buyShares to create initial liquidity (totalSupply == 0 path)
    await baseToken.connect(owner).transfer(instanceAddress, ethers.parseEther("1000"));
    await quoteToken.connect(owner).transfer(instanceAddress, ethers.parseEther("1000"));

    await instance.connect(owner).buyShares(owner.address);

    // Get initial _BASE_TARGET_ after first deposit
    const baseTargetAfterFirst = await instance._BASE_TARGET_();

    // Now add more liquidity to trigger the else-if branch (baseReserve > 0 && quoteReserve > 0)
    await baseToken.connect(owner).transfer(instanceAddress, ethers.parseEther("500"));
    await quoteToken.connect(owner).transfer(instanceAddress, ethers.parseEther("500"));

    // Record _BASE_TARGET_ before second buyShares
    const baseTargetBefore = await instance._BASE_TARGET_();

    // Execute second buyShares
    await instance.connect(owner).buyShares(owner.address);

    // Get _BASE_TARGET_ after second buyShares
    const baseTargetAfter = await instance._BASE_TARGET_();

    // In the original contract, _BASE_TARGET_ should increase (addition)
    // In the mutant, _BASE_TARGET_ will decrease (subtraction)
    // This assertion will pass on original but fail on mutant
    expect(baseTargetAfter).to.be.gt(baseTargetBefore);

    // Additional verification: the base target should be greater than the first deposit's target
    expect(baseTargetAfter).to.be.gt(baseTargetAfterFirst);
  });
});