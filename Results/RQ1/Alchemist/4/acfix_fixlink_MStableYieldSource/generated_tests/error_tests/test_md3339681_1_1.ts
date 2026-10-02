import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection", function () {
  it("should emit Initialized event with correct savings contract address on deployment", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource and capture the event
    const Factory = await ethers.getContractFactory("MStableYieldSource");

    // Expect the Initialized event to be emitted with the savings contract address
    await expect(Factory.deploy(await mockSavings.getAddress()))
      .to.emit(Factory, "Initialized")
      .withArgs(await mockSavings.getAddress());
  });
});