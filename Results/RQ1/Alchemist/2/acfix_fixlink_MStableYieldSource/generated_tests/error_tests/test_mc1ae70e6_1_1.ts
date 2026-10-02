import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant mc1ae70e6 (event emission removed)", function () {
  it("should emit ApprovedMax event when approveMax is called by owner", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a valid underlying token address
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Now call approveMax and check for the event
    await expect(instance.connect(owner).approveMax())
      .to.emit(instance, "ApprovedMax")
      .withArgs(owner.address);
  });
});