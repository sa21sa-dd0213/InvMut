import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - depositToken", function () {
  it("should detect mutant that removes depositToken body by verifying the returned address", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a known underlying token address
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the expected mAsset address from the mock savings contract
    const expectedMAsset = await mockSavings.underlying();

    // Call depositToken and verify it returns the correct address
    const returnedAddress = await instance.depositToken();

    // On the original contract, this returns address(mAsset) which equals expectedMAsset
    // On the mutant, the function body is removed so it returns address(0) instead
    expect(returnedAddress).to.equal(expectedMAsset);
  });
});