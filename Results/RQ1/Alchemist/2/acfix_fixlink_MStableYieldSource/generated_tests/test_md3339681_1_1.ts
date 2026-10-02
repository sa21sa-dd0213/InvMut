import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant md3339681 test", function () {
  it("should emit Initialized event on deployment", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that implements the required interface
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    const Factory = await ethers.getContractFactory("MStableYieldSource");

    // Expect the Initialized event to be emitted with the savings contract address
    await expect(Factory.deploy(mockSavings.target))
      .to.emit(Factory, "Initialized")
      .withArgs(mockSavings.target);
  });
});