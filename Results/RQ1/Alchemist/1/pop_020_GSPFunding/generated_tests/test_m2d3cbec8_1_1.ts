import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m2d3cbec8", function () {
  it("should kill mutant where quoteAmount = quoteBalance * shareAmount - totalShares causes underflow", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    const instance = await GSPFunding.deploy();
    await instance.waitForDeployment();

    // Setup: need base and quote tokens for the pool
    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the pool with tokens
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    const i = ethers.parseEther("2"); // price ratio
    const k = ethers.parseEther("0.5"); // swap fee

    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);

    // Initialize the GSP pool
    await instance.init(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      i,
      k,
      ethers.parseEther("0.003"), // lp fee rate
      ethers.parseEther("0.001"), // mt fee rate
      owner.address,
      "GSP-LP",
      "GSP"
    );

    // First buy shares to create initial liquidity
    await instance.connect(addr1).buyShares(addr1.address);

    // Get the total supply after initial mint
    const totalSupply = await instance.totalSupply();

    // Setup scenario: quoteBalance * shareAmount < totalShares to trigger underflow
    // We want: quoteBalance * shareAmount < totalShares
    // Since quoteBalance is ~2000e18 and totalSupply is small after initialization,
    // we need to pick shareAmount such that quoteBalance * shareAmount < totalSupply
    
    // After buyShares with 1000 base and 2000 quote, totalSupply is ~1000e18
    // Let's try shareAmount = 1 wei
    const shareAmount = 1;
    
    // This will cause: quoteBalance * 1 < totalSupply
    // In original: quoteAmount = quoteBalance * 1 / totalSupply ≈ 2
    // In mutant: quoteAmount = quoteBalance * 1 - totalSupply ≈ -999... (underflow)
    
    // The transaction should revert in mutant due to underflow
    // but succeed in original
    
    await expect(
      instance.connect(addr1).sellShares(
        shareAmount,
        addr2.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        Math.floor(Date.now() / 1000) + 3600 // deadline
      )
    ).to.be.reverted; // Mutant will revert due to underflow
  });
});