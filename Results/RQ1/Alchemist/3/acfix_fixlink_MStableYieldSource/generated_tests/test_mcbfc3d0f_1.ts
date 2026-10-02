import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - mutant mcbfc3d0f", function () {
  it("should revert when non-owner calls approveMax()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a mock underlying token
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    const MockSavingsContract = await ethers.getContractFactory("contracts/mocks/MockSavingsContract.sol:MockSavingsContract");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
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