import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant me01ced96 - depositToken", function () {
  it("should return the correct underlying token address from depositToken()", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token that will act as the underlying mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock MAsset", "mMASS", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Deploy a mock SavingsContractV2 that returns our mock token from underlying()
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy the actual MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Call depositToken() and verify it returns the correct mAsset address
    const returnedAddress = await instance.depositToken();
    
    // The mutant returns address(0) instead of the actual mAsset address
    // This assertion will fail on the mutant and pass on the original
    expect(returnedAddress).to.equal(await mockToken.getAddress());
    expect(returnedAddress).to.not.equal(ethers.ZeroAddress);
  });
});