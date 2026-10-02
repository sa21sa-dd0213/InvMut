import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m38a8a6d9 test", function () {
  it("should kill mutant when buyShares is called with totalSupply > 0 but one reserve is zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with token addresses and parameters
    // Note: This assumes the contract has an initialization function - adjust as needed
    // For this test, we'll directly set the token addresses using the storage variables
    // This is a simplification - actual initialization may differ
    await instance.setBaseToken(baseToken.target);
    await instance.setQuoteToken(quoteToken.target);
    await instance.setMaintainer(owner.address);
    await instance.setI(ethers.parseEther("1")); // 1:1 price ratio
    await instance.setK(ethers.parseEther("0.5")); // 50% K parameter
    await instance.setMtFeeRate(0);
    await instance.setLpFeeRate(0);

    // Transfer tokens to the GSPFunding contract to simulate initial liquidity
    await baseToken.transfer(instance.target, ethers.parseEther("1000"));
    await quoteToken.transfer(instance.target, ethers.parseEther("1000"));

    // Step 1: First buyShares to create totalSupply > 0 and set reserves
    await instance.connect(addr1).buyShares(addr1.address);

    // Step 2: Drain the quote token from the contract to make one reserve zero
    await quoteToken.connect(owner).transferFrom(
      instance.target,
      owner.address,
      await quoteToken.balanceOf(instance.target)
    );

    // Step 3: Sync to update reserves
    await instance.sync();

    // Step 4: Now totalSupply > 0, but one reserve is zero
    // Attempt to buyShares again - this should revert in original but succeed in mutant
    await expect(
      instance.connect(addr2).buyShares(addr2.address)
    ).to.be.reverted; // Original reverts, mutant might not revert
  });
});