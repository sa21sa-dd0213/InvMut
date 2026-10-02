import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken", function () {
  it("should kill mutant m2672356a by verifying correct division vs subtraction in balanceOfToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock underlying token
    const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const underlyingToken = await MockERC20.deploy("Underlying", "UND", 18);
    await underlyingToken.waitForDeployment();

    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("contracts/test/MockSavingsV2.sol:MockSavingsV2");
    const savings = await MockSavings.deploy(await underlyingToken.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // Setup: mint tokens to user, approve yieldSource to spend them
    const depositAmount = ethers.parseEther("100");
    await underlyingToken.mint(user.address, depositAmount);
    await underlyingToken.connect(user).approve(await yieldSource.getAddress(), depositAmount);

    // User supplies tokens
    await yieldSource.connect(user).supplyTokenTo(depositAmount, user.address);

    // Get the exchange rate from the mock (set to 1e18 for simplicity)
    const exchangeRate = await savings.exchangeRate();

    // Get imBalances for user
    const imBalance = await yieldSource.imBalances(user.address);

    // Calculate expected value: (imBalances * exchangeRate) / 1e18
    const expectedBalance = (imBalance * exchangeRate) / ethers.parseEther("1");

    // Call balanceOfToken
    const actualBalance = await yieldSource.balanceOfToken(user.address);

    // The mutant would return (imBalances * exchangeRate) - 1e18
    // which would be different from expectedBalance
    expect(actualBalance).to.equal(expectedBalance);
  });
});