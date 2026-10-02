import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant mc1ae70e6 (remove ApprovedMax event emission)", function () {
  it("should emit ApprovedMax event when approveMax is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract to pass to constructor
    // We need to deploy a minimal contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Call approveMax from owner and check for the ApprovedMax event
    await expect(instance.connect(owner).approveMax())
      .to.emit(instance, "ApprovedMax")
      .withArgs(owner.address);
  });
});