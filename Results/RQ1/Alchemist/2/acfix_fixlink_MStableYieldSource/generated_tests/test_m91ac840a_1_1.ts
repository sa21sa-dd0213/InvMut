import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m91ac840a (remove nonReentrant modifier from supplyTokenTo)", function () {
  it("should revert on reentrant call to supplyTokenTo when nonReentrant modifier is present", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock savings contract that allows reentrancy
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the mAsset token address from the deployed instance
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Mint some mAsset tokens to addr1 for testing
    const mintAmount = ethers.parseEther("1000");
    await mAsset.transfer(addr1.address, mintAmount);

    // Approve the MStableYieldSource to spend addr1's tokens
    await mAsset.connect(addr1).approve(await instance.getAddress(), ethers.MaxUint256);

    // Deploy a reentrancy attacker contract
    const ReentrancyAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await ReentrancyAttackerFactory.deploy(await instance.getAddress(), await mAsset.getAddress());
    await attacker.waitForDeployment();

    // Transfer mAsset tokens to attacker for the attack
    await mAsset.transfer(await attacker.getAddress(), mintAmount);

    // Call the attack function - this should trigger reentrancy
    // The attacker contract will call supplyTokenTo from within supplyTokenTo
    // If the nonReentrant modifier is present (original), it should revert
    // If the modifier is removed (mutant), it should succeed
    await expect(
      attacker.connect(addr1).attack(ethers.parseEther("100"), addr1.address)
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});

// Helper contracts for testing (these would need to be in separate files or inline)
// MockSavingsContract - a minimal savings contract that allows reentrancy
// ReentrancyAttacker - a contract that performs reentrant calls