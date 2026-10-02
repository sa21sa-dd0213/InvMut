import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - m31dec8ae", function () {
  it("should emit Supplied event when supplyTokenTo is called, and fail on mutant that removes the event emission", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();
    
    const MockSavingsContractV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContractV2.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();
    
    // Fund owner with mAsset tokens
    await mAsset.transfer(owner.address, ethers.parseEther("1000"));
    await mAsset.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Call supplyTokenTo and check for Supplied event emission
    const supplyAmount = ethers.parseEther("100");
    const tx = await instance.connect(owner).supplyTokenTo(supplyAmount, addr1.address);
    const receipt = await tx.wait();
    
    // Check that Supplied event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Supplied")
      .withArgs(owner.address, addr1.address, supplyAmount);
  });
});