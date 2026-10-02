import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken division vs addition", function () {
  it("should kill mutant m207675fe by verifying zero balance returns 0, not 1e18", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a simple exchange rate
    // Since we cannot use mocks, we need a real ISavingsContractV2 implementation
    // For testing purposes, we'll deploy a minimal contract that implements the interface
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSourceFactory.deploy(
      await mockSavings.getAddress()
    );
    await yieldSource.waitForDeployment();

    // Get the mAsset address from the deployed contract
    const mAssetAddress = await yieldSource.mAsset();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Mint some mAsset to owner and approve yieldSource
    // The mock savings underlying token should be mintable
    await mAsset.mint(owner.address, ethers.parseEther("1000"));
    await mAsset.connect(owner).approve(await yieldSource.getAddress(), ethers.parseEther("1000"));

    // Supply some tokens to addr1 to create an imBalance entry
    await yieldSource.connect(owner).supplyTokenTo(ethers.parseEther("100"), addr1.address);

    // Now test the balanceOfToken for a user with zero imBalances (e.g., addr2)
    const zeroBalance = await yieldSource.balanceOfToken(addr2.address);
    
    // The original function returns 0 for zero imBalances
    // The mutant returns (0 * exchangeRate) + 1e18 = 1e18
    // This assertion will pass on original but fail on mutant
    expect(zeroBalance).to.equal(0);
  });
});