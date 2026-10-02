import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool - kill mutant mbd1c393d (missing Withdraw event in redeem)", function () {
  it("should emit Withdraw event when redeem is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockERC20.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheToken
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await MockTrancheToken.deploy("Tranche", "TRN", 18);
    await shareToken.waitForDeployment();

    // Deploy mock InvestmentManager
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();

    // Setup: authorize owner, mint shares to owner, set up mock to return expected values
    await instance.rely(owner.address);

    // Mint some shares to owner via the auth-protected mint function
    const mintAmount = ethers.parseEther("100");
    await instance.mint(owner.address, mintAmount);

    // Configure mock InvestmentManager to return a specific value for processRedeem
    const redeemReturnValue = ethers.parseEther("50");
    await investmentManager.setProcessRedeemReturnValue(redeemReturnValue);

    // Call redeem as owner
    const sharesToRedeem = ethers.parseEther("10");
    const tx = await instance.connect(owner).redeem(sharesToRedeem, owner.address, owner.address);
    const receipt = await tx.wait();

    // Verify Withdraw event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Withdraw")
      .withArgs(
        await instance.getAddress(),  // sender (the pool itself)
        owner.address,                 // receiver
        owner.address,                 // owner
        redeemReturnValue,             // assets (currencyPayout)
        sharesToRedeem                 // shares
      );
  });
});