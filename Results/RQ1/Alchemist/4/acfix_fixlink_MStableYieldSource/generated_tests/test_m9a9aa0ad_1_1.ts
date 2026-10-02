import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Reentrancy test for redeemToken", function () {
  it("should revert on reentrancy attack when nonReentrant modifier is present (original) and succeed without it (mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy mock ERC20 token (mAsset)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    // Deploy mock SavingsContractV2
    const MockSavingsV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsV2.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // Fund yieldSource with mAsset for reentrancy test
    await mAsset.transfer(await yieldSource.getAddress(), ethers.parseEther("100"));
    await savings.setYieldSourceBalance(ethers.parseEther("100"));

    // Deploy attacker contract that will attempt reentrancy
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await yieldSource.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract with mAsset tokens
    await mAsset.transfer(await attackerContract.getAddress(), ethers.parseEther("10"));

    // Give allowance for yieldSource to pull mAsset from attacker contract
    await mAsset.connect(attacker).approve(await yieldSource.getAddress(), ethers.parseEther("10"));

    // First supply tokens to create imBalance
    await yieldSource.connect(attacker).supplyTokenTo(ethers.parseEther("5"), await attackerContract.getAddress());

    // Now attempt reentrancy attack
    // The attacker contract will call redeemToken and during the transfer it will call back redeemToken again
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("1"))
    ).to.be.reverted;

    // If the test passes (reverts), it means the nonReentrant modifier is working (original behavior)
    // If it does NOT revert, the mutant is detected (missing nonReentrant modifier allows reentrancy)
  });
});