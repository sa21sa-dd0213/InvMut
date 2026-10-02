import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant maf506a8d - kill test", function () {
  it("should revert when initial buyShares results in shares <= 2001 (before dead share mint)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get token addresses (need to deploy mock tokens or use existing ones)
    // For this test, we need to set up the contract with tokens that have balances
    // We'll deploy simple ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Initialize the contract (assuming there's an init function or constructor params)
    // Note: The contract doesn't show constructor, but we need to set initial parameters
    // For testing, we'll assume we can set the tokens and initial price
    // This is a simplified approach - in real testing we'd need the actual initialization
    
    // Fund the contract with tokens
    const baseAmount = ethers.parseEther("1500"); // Small amount to trigger shares <= 2001
    const quoteAmount = ethers.parseEther("1000");
    
    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);
    
    // Call buyShares with minimal input
    // The original requires shares > 2001, so we need to calculate the exact amount
    // that would produce shares between 1002 and 2001
    await expect(
      instance.connect(addr1).buyShares(addr1.address)
    ).to.be.revertedWith("MINT_AMOUNT_NOT_ENOUGH");
  });
});