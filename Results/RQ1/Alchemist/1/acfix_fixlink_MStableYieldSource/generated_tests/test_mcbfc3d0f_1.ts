import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant mcbfc3d0f", function () {
  it("should revert when non-owner calls approveMax() (detects removed onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements the required interface
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy the MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call approveMax from a non-owner address - should revert in original
    await expect(
      instance.connect(addr1).approveMax()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});

// Mock contract to satisfy the constructor requirements
contract("MockSavingsContractV2", function() {
  // Deploy a minimal ERC20 token for the underlying
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20Factory.deploy();
  await mockERC20.waitForDeployment();
  
  // Return the mock token address from underlying()
  this.underlying = async function() {
    return await mockERC20.getAddress();
  };
});