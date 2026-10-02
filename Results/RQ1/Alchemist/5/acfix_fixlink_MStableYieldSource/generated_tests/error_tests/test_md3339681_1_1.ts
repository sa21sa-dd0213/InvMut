import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - Initialized event emission", function () {
  it("should emit Initialized event with correct savings contract address on deployment", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that implements the required interface
    // Since MStableYieldSource constructor requires ISavingsContractV2, we need a minimal mock
    const SavingsMock = await ethers.getContractFactory("SavingsContractV2Mock");
    const savingsMock = await SavingsMock.deploy();
    await savingsMock.waitForDeployment();

    // Get the factory and deploy the MStableYieldSource
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");

    // Expect the Initialized event to be emitted with the savings contract address
    await expect(
      MStableYieldSourceFactory.deploy(savingsMock.target)
    ).to.emit(MStableYieldSourceFactory, "Initialized").withArgs(savingsMock.target);
  });
});