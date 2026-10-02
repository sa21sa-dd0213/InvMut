import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mdf83f7ba test", function () {
  it("should kill mutant by checking redeem return value is non-zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy required mock contracts for constructor
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20Factory.deploy("Asset", "AST", 18);
    await mockAsset.waitForDeployment();
    
    const MockTrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const mockShare = await MockTrancheTokenFactory.deploy("Share", "SHR", 18);
    await mockShare.waitForDeployment();
    
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManagerFactory.deploy();
    await mockInvestmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await mockAsset.getAddress(),
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Setup: authorize test accounts
    await liquidityPool.connect(owner).rely(addr1.address);
    await liquidityPool.connect(owner).rely(addr2.address);
    
    // Setup mock investment manager to return a known value
    const expectedPayout = ethers.parseEther("100");
    await mockInvestmentManager.setProcessRedeemReturnValue(expectedPayout);
    
    // Approve the owner to act on behalf of addr1
    await liquidityPool.connect(addr1).rely(addr2.address);
    
    // Call redeem and capture return value
    const shares = ethers.parseEther("50");
    const tx = await liquidityPool.connect(addr2).redeem.staticCall(
      shares,
      addr1.address,
      addr1.address
    );
    
    // Assert that the return value is the expected payout (non-zero)
    // The mutant removes the return statement, so it would return 0 instead
    expect(tx).to.equal(expectedPayout);
  });
});