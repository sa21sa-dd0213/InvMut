import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - mc1ae70e6", function () {
  it("should emit ApprovedMax event when approveMax is called by owner", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a valid underlying token address
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Call approveMax from the owner and check for the event emission
    await expect(instance.connect(owner).approveMax())
      .to.emit(instance, "ApprovedMax")
      .withArgs(owner.address);
  });
});