import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - onlyOwner modifier", function () {
  it("should revert when approveMax() is called by non-owner", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock mAsset address
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax() from a non-owner address
    // The original contract should revert, the mutant should not
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});