import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when calling file() with unrecognized parameter, killing mutant that removed parameter validation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
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
    
    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Call file() with an unrecognized parameter - should revert in original but succeed in mutant
    await expect(
      instance.connect(owner).file(
        ethers.encodeBytes32String("unrecognizedParam"),
        await mockInvestmentManager.getAddress()
      )
    ).to.be.revertedWith("LiquidityPool/file-unrecognized-param");
  });
});