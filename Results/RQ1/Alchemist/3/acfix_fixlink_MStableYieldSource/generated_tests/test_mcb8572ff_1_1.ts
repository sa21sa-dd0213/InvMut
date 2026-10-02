import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant mcb8572ff", function () {
  it("should return correct actual amount on redeem, not a division result", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token (mAsset)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // Fund user with mAsset tokens
    const supplyAmount = ethers.parseEther("1000");
    await mAsset.mint(await user.getAddress(), supplyAmount);

    // User approves yield source to spend mAsset
    await mAsset.connect(user).approve(await yieldSource.getAddress(), supplyAmount);

    // User supplies tokens to yield source
    await yieldSource.connect(user).supplyTokenTo(supplyAmount, await user.getAddress());

    // Get user's imBalances after supply
    const creditsAfterSupply = await yieldSource.imBalances(await user.getAddress());
    expect(creditsAfterSupply).to.be.gt(0);

    // Now redeem half of the supplied amount
    const redeemAmount = supplyAmount / 2n;
    const mAssetBalanceBefore = await mAsset.balanceOf(await user.getAddress());

    // Perform redeem
    const tx = await yieldSource.connect(user).redeemToken(redeemAmount);
    const receipt = await tx.wait();

    const mAssetBalanceAfter = await mAsset.balanceOf(await user.getAddress());
    const actualReceived = mAssetBalanceAfter - mAssetBalanceBefore;

    // The actual amount received should equal the difference (not a division)
    // In the mutant, mAssetsActual = mAssetBalanceAfter / mAssetBalanceBefore, which
    // would produce a very small number instead of the actual received amount
    expect(actualReceived).to.be.gt(0);
    expect(actualReceived).to.be.closeTo(redeemAmount, ethers.parseEther("1")); // Allow small rounding differences
  });
});