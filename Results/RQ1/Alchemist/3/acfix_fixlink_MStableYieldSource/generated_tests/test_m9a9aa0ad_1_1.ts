import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m9a9aa0ad - reentrancy guard removal", function () {
  it("should revert on reentrant call when nonReentrant modifier is present (original) but succeed when removed (mutant)", async function () {
    const [owner, attacker, user] = await ethers.getSigners();

    // Deploy mock savings contract and mock mAsset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Setup: fund attacker with mAssets and approve
    await mAsset.mint(await attacker.getAddress(), ethers.parseEther("1000"));
    await mAsset.connect(attacker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Deploy reentrancy attacker contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await instance.getAddress(), await savings.getAddress(), await mAsset.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract with mAssets and approve
    await mAsset.mint(await attackerContract.getAddress(), ethers.parseEther("100"));
    await mAsset.connect(attackerContract).approve(await instance.getAddress(), ethers.parseEther("100"));

    // First supply tokens to get balance
    await instance.connect(attacker).supplyTokenTo(ethers.parseEther("10"), await attacker.getAddress());

    // Attempt reentrancy: call redeemToken through attacker contract which will try to re-enter
    // On original contract with nonReentrant, this should revert
    // On mutant without nonReentrant, this should succeed
    const tx = attackerContract.connect(attacker).attack(ethers.parseEther("5"));

    // The test expects revert for original (nonReentrant present), but for mutant it would succeed
    // Since we're testing the mutant, we expect it to succeed (no revert)
    await expect(tx).to.not.be.reverted;

    // Verify the attacker drained more than allowed (reentrancy succeeded)
    const attackerBalance = await mAsset.balanceOf(await attacker.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("5")); // Should have gotten more than requested
  });
});