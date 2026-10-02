import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - meca1bf3c", function () {
  it("should kill mutant by calling buyShares when both reserves are positive", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      0, // _MT_FEE_RATE_
      0, // _LP_FEE_RATE_
      ethers.parseEther("1"), // _I_ (initial price)
      0, // _K_
      owner.address // _MAINTAINER_
    );
    await instance.waitForDeployment();

    // Initialize the pool by minting initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");

    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);
    await baseToken.connect(owner).approve(await instance.getAddress(), initialBase);
    await quoteToken.connect(owner).approve(await instance.getAddress(), initialQuote);

    // First buyShares to create initial liquidity (totalSupply becomes 0 initially)
    await instance.connect(owner).buyShares(owner.address);

    // Now add more tokens to create positive reserves scenario
    const additionalBase = ethers.parseEther("100");
    const additionalQuote = ethers.parseEther("100");

    await baseToken.mint(owner.address, additionalBase);
    await quoteToken.mint(owner.address, additionalQuote);
    await baseToken.connect(owner).transfer(await instance.getAddress(), additionalBase);
    await quoteToken.connect(owner).transfer(await instance.getAddress(), additionalQuote);

    // This call should trigger the else-if branch (baseReserve > 0 && quoteReserve > 0)
    // In the mutant, quoteReserve < 0 is always false, so it will never enter this branch
    // causing incorrect behavior (likely revert or wrong share calculation)
    await expect(
      instance.connect(owner).buyShares(addr1.address)
    ).to.not.be.reverted;

    // Verify that shares were minted correctly by checking the balance
    const sharesBalance = await instance.balanceOf(addr1.address);
    expect(sharesBalance).to.be.gt(0);
  });
});