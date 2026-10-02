import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m9a9aa0ad - reentrancy guard removal", function () {
  let instance: any;
  let owner: any;
  let attacker: any;
  let mockSavings: any;
  let mockAsset: any;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    // Deploy mock token (mAsset)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockAsset = await MockERC20.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mockAsset.waitForDeployment();

    // Deploy mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    mockSavings = await MockSavings.deploy(await mockAsset.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with constructor args
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Transfer some tokens to attacker and approve contract
    await mockAsset.transfer(attacker.address, ethers.parseEther("1000"));
    await mockAsset.connect(attacker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Fund attacker's balance for reentrancy (via supplyTokenTo)
    await instance.connect(attacker).supplyTokenTo(ethers.parseEther("100"), attacker.address);
  });

  it("should revert on reentrancy attempt when nonReentrant modifier is present (original) but succeed without it (mutant)", async function () {
    // Deploy reentrancy attacker contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await instance.getAddress(), await mockAsset.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract with tokens and approve
    await mockAsset.transfer(await attackerContract.getAddress(), ethers.parseEther("500"));
    await mockAsset.connect(attacker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Call the attack - this should revert on original but may succeed on mutant
    // The attacker contract's fallback will call redeemToken again
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("50"))
    ).to.be.reverted; // Original reverts due to nonReentrant; mutant might not revert
  });
});