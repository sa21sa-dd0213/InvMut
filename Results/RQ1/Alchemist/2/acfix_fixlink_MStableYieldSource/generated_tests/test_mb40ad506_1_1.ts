import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mb40ad506 - imBalances deduction test", function () {
  it("should revert or fail when imBalances is not decremented after redeemToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock mAsset token (ERC20) and mock SavingsContractV2
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Fund addr1 with mAsset tokens
    const supplyAmount = ethers.parseEther("100");
    await mAsset.mint(addr1.address, supplyAmount);

    // Approve the yield source to spend tokens
    await mAsset.connect(addr1).approve(await instance.getAddress(), supplyAmount);

    // First, supply tokens to get imBalances recorded
    const supplyTx = await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    await supplyTx.wait();

    // Get imBalances after supply
    const balanceAfterSupply = await instance.imBalances(addr1.address);
    expect(balanceAfterSupply).to.be.gt(0);

    // Now redeem the same amount
    const redeemTx = await instance.connect(addr1).redeemToken(supplyAmount);
    await redeemTx.wait();

    // Check that imBalances for addr1 is now 0 (or significantly reduced)
    const balanceAfterRedeem = await instance.imBalances(addr1.address);

    // In the original contract, this should be 0 after full redemption
    // In the mutant (which skips the deduction), this would still be > 0
    expect(balanceAfterRedeem).to.equal(0);
  });
});