import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant mc1ae70e6 - ApprovedMax event", function () {
  it("should emit ApprovedMax event when approveMax is called by owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that returns a valid underlying token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Approve max tokens for the savings contract
    const tx = await instance.connect(owner).approveMax();
    
    // Expect the ApprovedMax event to be emitted with the owner address
    await expect(tx)
      .to.emit(instance, "ApprovedMax")
      .withArgs(owner.address);
  });
});