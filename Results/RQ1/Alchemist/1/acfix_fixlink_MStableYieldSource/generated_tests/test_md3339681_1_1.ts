import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - md3339681", function () {
  it("should emit Initialized event on construction", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock underlying token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Get the constructor arguments for MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");

    // Deploy and capture the event emission
    const mockSavingsAddress = await mockSavings.getAddress();
    await expect(
      Factory.deploy(mockSavingsAddress)
    ).to.emit(Factory, "Initialized").withArgs(mockSavingsAddress);
  });
});