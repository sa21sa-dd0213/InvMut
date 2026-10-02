import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - Redeemed event", function () {
  it("should emit Redeemed event when redeemToken is called, killing the mutant that removes the event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock mAsset token (simple ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock Asset", "mAsset", 18);
    await mAsset.waitForDeployment();
    
    // Deploy mock savings contract
    const MockSavingsContractV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContractV2.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();
    
    // Setup: fund owner with mAsset and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(owner.address, depositAmount);
    await mAsset.connect(owner).approve(await instance.getAddress(), depositAmount);
    
    // First supply tokens to create balance
    await instance.connect(owner).supplyTokenTo(depositAmount, owner.address);
    
    // Now test redeemToken and expect Redeemed event
    const redeemAmount = ethers.parseEther("10");
    
    await expect(
      instance.connect(owner).redeemToken(redeemAmount)
    )
      .to.emit(instance, "Redeemed")
      .withArgs(
        owner.address, // msg.sender
        redeemAmount,  // requested mAssetAmount
        ethers.parseEther("10") // actual amount (simplified for mock)
      );
  });
});