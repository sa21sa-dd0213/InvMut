import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken", function () {
  it("should detect mutant that replaces multiplication with addition in balanceOfToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // First, supply some tokens to addr1 to set imBalances
    // We need to fund the contract with mAsset first
    const mAssetAddress = await instance.mAsset();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Owner sends mAsset to addr1 so they can supply
    const supplyAmount = ethers.parseEther("100");
    await mAsset.transfer(addr1.address, supplyAmount);

    // Approve the contract to spend addr1's tokens
    await mAsset.connect(addr1).approve(await instance.getAddress(), supplyAmount);

    // Supply tokens to addr1
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);

    // Now get the exchange rate from the mock (returns 1e18 * 2 = 2x)
    const exchangeRate = await mockSavings.exchangeRate();

    // Calculate expected balance using original formula: (imBalances * exchangeRate) / 1e18
    const imBalance = await instance.imBalances(addr1.address);
    const expectedBalance = (imBalance * exchangeRate) / ethers.parseEther("1");

    // Call balanceOfToken - mutant will return (imBalances + exchangeRate) / 1e18
    const actualBalance = await instance.balanceOfToken(addr1.address);

    // If mutant is present, this assertion will fail because addition != multiplication
    expect(actualBalance).to.equal(expectedBalance);
  });
});

// Mock contracts need to be compiled as part of the test setup
// We define them as standalone contracts that will be compiled by Hardhat