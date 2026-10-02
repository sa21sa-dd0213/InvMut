import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - md3339681", function () {
  it("should emit Initialized event on deployment (detects missing emit in constructor)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a valid underlying token address
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MOCK");
    await mockToken.waitForDeployment();
    
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource and capture the event emission
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    
    // We expect the Initialized event to be emitted with the savings contract address
    await expect(
      Factory.deploy(await mockSavings.getAddress())
    ).to.emit(Factory, "Initialized").withArgs(await mockSavings.getAddress());
  });
});