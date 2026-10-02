import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - onlyOwner modifier", function () {
  it("should revert when owner calls a function with onlyOwner modifier if mutant is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // We need to deploy the contract. Since the constructor requires an ISavingsContractV2,
    // we'll need to deploy a mock savings contract first.
    // Create a minimal mock for ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // The approveMax function uses onlyOwner modifier
    // In the original, owner should succeed
    // In the mutant (where == is replaced with !=), owner will revert
    await expect(
      instance.connect(owner).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});