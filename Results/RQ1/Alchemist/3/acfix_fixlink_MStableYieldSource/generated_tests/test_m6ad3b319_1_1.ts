import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax() due to onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock mAsset
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Attempt to call approveMax() from a non-owner address
    // In the original contract, this should revert
    // In the mutant where the require statement is removed, it would succeed
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});