import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - depositToken", function () {
  it("should return the correct mAsset address from depositToken()", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token to serve as the underlying mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockAsset = await MockERC20.deploy("Mock Asset", "mASSET", 18);
    await mockAsset.waitForDeployment();
    
    // Deploy a mock SavingsContract that returns the mockAsset address from underlying()
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsContract.deploy(await mockAsset.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy the MStableYieldSource with the mock savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();
    
    // Call depositToken() and verify it returns the correct mAsset address
    const returnedAddress = await yieldSource.depositToken();
    expect(returnedAddress).to.equal(await mockAsset.getAddress());
  });
});