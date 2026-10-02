import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource mutant detection - balanceOfToken division replaced with subtraction", function () {
  it("should detect mutant by comparing balanceOfToken result with expected value from deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a known exchange rate
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the mAsset token address from the instance
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund owner with mAsset tokens (mint in mock if needed, or use a real token)
    // For this test, we'll assume the mock provides sufficient balance
    const depositAmount = ethers.parseEther("10");
    
    // Approve and deposit tokens
    await mAsset.approve(await instance.getAddress(), depositAmount);
    await instance.supplyTokenTo(depositAmount, addr1.address);

    // Calculate expected balance using the correct formula: (credits * exchangeRate) / 1e18
    const exchangeRate = await mockSavings.exchangeRate();
    const creditsIssued = depositAmount; // Assuming 1:1 conversion for simplicity in mock
    const expectedBalance = (creditsIssued * exchangeRate) / BigInt(1e18);

    // Call balanceOfToken - mutant will return credits * exchangeRate - 1e18 instead
    const actualBalance = await instance.balanceOfToken(addr1.address);

    // The mutant would produce a wrong value, so this assertion should fail for the mutant
    expect(actualBalance).to.equal(expectedBalance);
  });
});