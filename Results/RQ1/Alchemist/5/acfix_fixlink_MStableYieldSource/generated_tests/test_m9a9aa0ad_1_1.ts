import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant m9a9aa0ad (nonReentrant removed from redeemToken)", function () {
  it("should revert on reentrant call to redeemToken when nonReentrant modifier is present (original), but allow reentrancy if modifier is removed (mutant)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy mock contracts for testing
    // First, deploy a mock ERC20 that will be used as the mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", 18);
    await mockToken.waitForDeployment();

    // Deploy a mock SavingsContractV2 that implements the required interface
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy();
    await attackerContract.waitForDeployment();

    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();

    // Fund the attacker with tokens
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint(await attacker.getAddress(), mintAmount);

    // Approve and supply tokens to yield source from attacker
    await mockToken.connect(attacker).approve(await yieldSource.getAddress(), mintAmount);
    await yieldSource.connect(attacker).supplyTokenTo(ethers.parseEther("10"), await attacker.getAddress());

    // Set up the attacker contract to target the yield source
    await attackerContract.setTarget(await yieldSource.getAddress());
    await attackerContract.setToken(await mockToken.getAddress());

    // Fund attacker contract with some mAsset tokens for the reentrancy attack
    await mockToken.mint(await attackerContract.getAddress(), ethers.parseEther("50"));

    // Approve the yield source to spend from attacker contract
    await mockToken.connect(attacker).approve(await attackerContract.getAddress(), ethers.parseEther("50"));
    await attackerContract.approveYieldSource();

    // Now attempt the reentrant attack - this should revert in the original
    // because of the nonReentrant modifier, but succeed in the mutant
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("5"))
    ).to.be.reverted;

    // If the test passes (reverts), it means the nonReentrant modifier is working
    // If it doesn't revert, the mutant is detected (nonReentrant removed)
  });
});