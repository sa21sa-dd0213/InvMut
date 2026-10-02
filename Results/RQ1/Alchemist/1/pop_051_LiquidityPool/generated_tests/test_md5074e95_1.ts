import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - md5074e95", function () {
  it("should detect mutant by calling file with 'investmentManager' and verifying state change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("Asset", "AST", 18);
    await mockAsset.waitForDeployment();
    
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheToken.deploy("Share", "SHR", 18);
    await mockShare.waitForDeployment();
    
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManager.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Deploy a new investment manager to test the file function
    const newInvestmentManager = await MockInvestmentManager.deploy();
    await newInvestmentManager.waitForDeployment();
    
    // Call file with "investmentManager" and a new address
    const tx = await liquidityPool.file(
      ethers.encodeBytes32String("investmentManager"),
      await newInvestmentManager.getAddress()
    );
    await tx.wait();
    
    // Verify the investment manager was updated
    const updatedManager = await liquidityPool.investmentManager();
    expect(updatedManager).to.equal(await newInvestmentManager.getAddress());
  });
});