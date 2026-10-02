import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - reentrancy test for redeemToken", function () {
  it("should prevent reentrancy attack on redeemToken when nonReentrant modifier is present", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");

    const mAsset = await MockERC20.deploy("Mock Asset", "mASSET", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Fund the yield source with mAsset
    await mAsset.transfer(await instance.getAddress(), ethers.parseEther("1000"));

    // Deploy malicious reentrancy contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract with mAsset and approve
    await mAsset.transfer(await attackerContract.getAddress(), ethers.parseEther("100"));
    await mAsset.connect(attacker).approve(await attackerContract.getAddress(), ethers.parseEther("100"));

    // Set up the reentrancy attack
    await attackerContract.connect(attacker).setReentrancyTarget(await savings.getAddress());

    // This should revert if nonReentrant is present
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});