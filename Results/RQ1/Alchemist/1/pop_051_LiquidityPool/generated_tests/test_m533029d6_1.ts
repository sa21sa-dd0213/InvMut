import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m533029d6 - file function string comparison", function () {
  it("should revert when calling file with a string that is lexicographically greater than 'investmentManager'", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock for the required interfaces
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockToken.deploy();
    await mockAsset.waitForDeployment();
    
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheToken.deploy();
    await mockShare.waitForDeployment();
    
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManager.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test");
    const Factory = await ethers.getContractFactory("LiquidityPool");
    const instance = await Factory.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await instance.waitForDeployment();

    // Test: calling file with a string >= "investmentManager" should revert in original
    // "investmentManagerX" is lexicographically greater than "investmentManager"
    await expect(
      instance.connect(owner).file(
        ethers.encodeBytes32String("investmentManagerX"),
        await mockInvestmentManager.getAddress()
      )
    ).to.be.reverted;
    
    // Also test with exact string to ensure it works
    await expect(
      instance.connect(owner).file(
        ethers.encodeBytes32String("investmentManager"),
        await mockInvestmentManager.getAddress()
      )
    ).to.not.be.reverted;
  });
});