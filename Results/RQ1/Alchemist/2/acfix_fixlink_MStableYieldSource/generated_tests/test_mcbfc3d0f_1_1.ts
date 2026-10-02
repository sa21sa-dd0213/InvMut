import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Mutant kill test for approveMax access control", function () {
  it("should revert when non-owner calls approveMax on original contract, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that implements the required interface
    const MockSavingsV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsV2.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax from non-owner address
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});