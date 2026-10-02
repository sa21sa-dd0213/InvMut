import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m7b66b0a0 - file function", function () {
  it("should kill mutant by verifying investmentManager can be updated via file()", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const AssetTokenFactory = await ethers.getContractFactory("MockERC20");
    const assetToken = await AssetTokenFactory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheTokenLike
    const TrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const trancheToken = await TrancheTokenFactory.deploy("Tranche", "TRN", 18);
    await trancheToken.waitForDeployment();

    // Deploy mock InvestmentManagerLike
    const InvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager1 = await InvestmentManagerFactory.deploy();
    await investmentManager1.waitForDeployment();

    // Deploy LiquidityPool with initial investmentManager
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.zeroPadBytes(ethers.toUtf8Bytes("tranche1"), 16);
    const instance = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await trancheToken.getAddress(),
      await investmentManager1.getAddress()
    );
    await instance.waitForDeployment();

    // Deploy a second InvestmentManager to test the update
    const investmentManager2 = await InvestmentManagerFactory.deploy();
    await investmentManager2.waitForDeployment();

    // Record the initial investmentManager address
    const initialManager = await instance.investmentManager();

    // Call file() to update investmentManager
    const tx = await instance.connect(owner).file(
      ethers.encodeBytes32String("investmentManager"),
      await investmentManager2.getAddress()
    );
    await tx.wait();

    // Verify the investmentManager was updated (mutant would keep old value)
    const updatedManager = await instance.investmentManager();
    expect(updatedManager).to.equal(await investmentManager2.getAddress());
    expect(updatedManager).to.not.equal(initialManager);
  });
});