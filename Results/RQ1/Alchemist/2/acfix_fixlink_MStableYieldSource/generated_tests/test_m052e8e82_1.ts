import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - m052e8e82", function () {
  it("should revert when owner calls approveMax if onlyOwner modifier is inverted", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a mock underlying token
    // We need to create a minimal mock that satisfies the ISavingsContractV2 interface
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // The owner should be able to call approveMax without revert in the original contract
    // In the mutant, the check is inverted (msg.sender != owner), so owner's call will revert
    await expect(
      instance.connect(owner).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});