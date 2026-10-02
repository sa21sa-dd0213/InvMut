import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant maf506a8d - kill test", function () {
  it("should revert when initial buyShares results in shares <= 2001 (before dead share mint)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the contract with tokens and initial parameters
    // Set the tokens, initial I value, and K value
    const I = ethers.parseEther("1"); // 1:1 price ratio
    const K = ethers.parseEther("0.5"); // 50% K value
    
    // Fund the contract with tokens - small amounts to trigger shares <= 2001
    const baseAmount = ethers.parseEther("1500");
    const quoteAmount = ethers.parseEther("1000");

    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);

    // Set the maintainer (needed for some operations)
    // Note: The contract doesn't have a direct setter for _I_ and _K_ accessible to the test
    // We need to adjust the test approach - the contract needs to be properly initialized
    
    // For this test to work, we need to call buyShares directly
    // The contract will calculate shares based on balances and I value
    // Since totalSupply is 0, it will enter the first branch and check if shares > 2001
    
    // First, we need to ensure the contract has the right state
    // Since we can't set _I_ directly, we'll use the default value (0)
    // which will cause the shares calculation to be minimal
    
    // Call buyShares - this should revert because shares will be <= 2001
    await expect(
      instance.connect(addr1).buyShares(addr1.address)
    ).to.be.revertedWith("MINT_AMOUNT_NOT_ENOUGH");
  });
});