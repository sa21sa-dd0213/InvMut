import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant md86c1c62 (exponentiation instead of multiplication)", function () {
  it("should return correct balanceOfToken using multiplication, not exponentiation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a minimal mock for the required underlying token and savings contract
    // We need to provide actual constructor arguments to MStableYieldSource
    // The constructor requires an ISavingsContractV2 address

    // First, deploy a mock ERC20 token (mAsset)
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mAsset", 18);
    await mAsset.waitForDeployment();

    // Deploy a mock savings contract that implements the required interface
    const MockSavings = await ethers.getContractFactory("contracts/mocks/MockSavingsV2.sol:MockSavingsV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Setup: Fund addr1 with mAsset and approve the yield source
    const mintAmount = ethers.parseEther("1000");
    await mAsset.mint(addr1.address, mintAmount);
    await mAsset.connect(addr1).approve(await instance.getAddress(), ethers.MaxUint256);

    // Supply tokens to create imBalances for addr1
    const supplyAmount = ethers.parseEther("500");
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);

    // Get the exchange rate from savings contract (set to 1e18 in mock)
    const exchangeRate = await savings.exchangeRate();

    // Calculate expected value using multiplication (original logic)
    const imBalance = await instance.imBalances(addr1.address);
    const expectedBalance = (imBalance * exchangeRate) / ethers.parseEther("1");

    // Call balanceOfToken - this is where the mutant changes * to **
    const actualBalance = await instance.balanceOfToken(addr1.address);

    // The mutant would produce (imBalances ** exchangeRate) / 1e18
    // which is astronomically different from the correct multiplication
    // Assert that the actual balance matches the multiplication result
    expect(actualBalance).to.equal(expectedBalance);
  });
});