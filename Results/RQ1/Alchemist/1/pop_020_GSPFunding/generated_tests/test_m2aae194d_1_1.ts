import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m2aae194d", function () {
  it("should kill mutant by providing quoteMinAmount less than actual quoteAmount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockToken.deploy("Base", "BASE", 18);
    const quoteToken = await MockToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding with constructor args
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFunding.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"), // _I_
      ethers.parseEther("0.5"), // _K_
      ethers.parseEther("0.003"), // _LP_FEE_RATE_
      ethers.parseEther("0.001"), // _MT_FEE_RATE_
      owner.address, // _MAINTAINER_
      false // _IS_OPEN_TWAP_
    );
    await gsp.waitForDeployment();
    
    // Fund tokens to contract and user
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    await baseToken.mint(owner.address, baseAmount);
    await quoteToken.mint(owner.address, quoteAmount);
    await baseToken.approve(await gsp.getAddress(), baseAmount);
    await quoteToken.approve(await gsp.getAddress(), quoteAmount);
    
    // Transfer tokens to the contract for liquidity
    await baseToken.transfer(await gsp.getAddress(), baseAmount);
    await quoteToken.transfer(await gsp.getAddress(), quoteAmount);
    
    // Buy shares for addr1
    await gsp.connect(addr1).buyShares(addr1.address);
    
    // Get user's share balance
    const shares = await gsp.balanceOf(addr1.address);
    
    // Calculate expected quoteAmount from sellShares
    const quoteBalance = await quoteToken.balanceOf(await gsp.getAddress());
    const totalSupply = await gsp.totalSupply();
    const expectedQuoteAmount = (quoteBalance * shares) / totalSupply;
    
    // Set quoteMinAmount to be strictly less than expectedQuoteAmount
    const quoteMinAmount = expectedQuoteAmount - ethers.parseEther("1");
    const baseMinAmount = 0;
    
    // This should revert on the mutant because quoteAmount (expectedQuoteAmount) 
    // is NOT equal to quoteMinAmount (which is less), but the mutant requires ==
    await expect(
      gsp.connect(addr1).sellShares(
        shares,
        addr1.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        9999999999
      )
    ).to.be.reverted;
  });
});