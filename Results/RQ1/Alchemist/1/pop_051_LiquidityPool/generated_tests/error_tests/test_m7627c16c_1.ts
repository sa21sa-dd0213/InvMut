import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool - Mutant m7627c16c test", function () {
  it("should emit Rely event on deployment with deployer address", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock contracts for constructor arguments
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy();
    await mockAsset.waitForDeployment();
    
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheToken.deploy();
    await mockShare.waitForDeployment();
    
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManager.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    
    // Expect the Rely event to be emitted with the deployer address
    await expect(
      ethers.getContractFactory("LiquidityPool").then(factory => 
        factory.deploy(poolId, trancheId, await mockAsset.getAddress(), await mockShare.getAddress(), await mockInvestmentManager.getAddress())
      )
    ).to.emit(await ethers.getContractFactory("LiquidityPool").then(f => f.deploy(poolId, trancheId, await mockAsset.getAddress(), await mockShare.getAddress(), await mockInvestmentManager.getAddress())), "Rely")
     .withArgs(owner.address);
  });
});