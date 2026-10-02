import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mcbfc3d0f - approveMax access control", function () {
  it("should revert when non-owner calls approveMax", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock savings contract that returns a mock underlying token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax from non-owner address - should revert
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});