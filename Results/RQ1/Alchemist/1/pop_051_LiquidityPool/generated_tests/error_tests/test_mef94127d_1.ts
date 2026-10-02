import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - updatePrice event emission", function () {
  it("should emit UpdatePrice event when updatePrice is called by authorized user", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock token contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const share = await MockTrancheToken.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Call updatePrice as authorized user (owner)
    const newPrice = ethers.parseEther("1.5");
    const tx = await instance.connect(owner).updatePrice(newPrice);
    
    // Verify the event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "UpdatePrice")
      .withArgs(newPrice);
    
    // Verify state changes still happen
    expect(await instance.latestPrice()).to.equal(newPrice);
    expect(await instance.lastPriceUpdate()).to.be.closeTo(
      (await ethers.provider.getBlock("latest")).timestamp,
      2
    );
  });
});