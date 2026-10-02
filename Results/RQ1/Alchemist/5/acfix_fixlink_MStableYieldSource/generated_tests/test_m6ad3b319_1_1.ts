import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax on original contract, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock savings contract and mock mAsset token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20.deploy("Mock MAsset", "mASSET", ethers.parseEther("1000000"));
    await mockMAsset.waitForDeployment();

    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockMAsset.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Try to call approveMax from non-owner address
    // In original contract this should revert, in mutant it should succeed
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});