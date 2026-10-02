import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - updatePrice timestamp", function () {
  it("should detect mutant by comparing lastPriceUpdate to block.timestamp", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockToken.deploy("Asset", "AST", 18);
    await mockAsset.waitForDeployment();
    
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheToken.deploy("Tranche", "TRN", 18);
    await mockShare.waitForDeployment();
    
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManager.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with required constructor arguments
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Call updatePrice as owner (authorized)
    const testPrice = ethers.parseEther("1.0");
    const tx = await instance.updatePrice(testPrice);
    const receipt = await tx.wait();
    
    // Get the block timestamp when the transaction was mined
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const expectedTimestamp = block.timestamp;
    
    // Read lastPriceUpdate from the contract
    const lastPriceUpdate = await instance.lastPriceUpdate();
    
    // Assert that lastPriceUpdate equals the block timestamp
    // On the mutant, it will equal block.prevrandao instead, causing this assertion to fail
    expect(lastPriceUpdate).to.equal(expectedTimestamp);
  });
});