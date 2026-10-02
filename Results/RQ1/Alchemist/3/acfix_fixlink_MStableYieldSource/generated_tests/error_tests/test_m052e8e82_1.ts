import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - onlyOwner modifier", function () {
  it("should revert when non-owner calls approveMax (mutant changes == to !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a valid underlying token address
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();
    
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Non-owner should be able to call approveMax (mutant allows it)
    // But in the original contract, this should revert
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});