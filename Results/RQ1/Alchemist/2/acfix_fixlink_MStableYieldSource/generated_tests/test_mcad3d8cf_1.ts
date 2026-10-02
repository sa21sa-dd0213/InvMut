import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - mcad3d8cf", function () {
  it("should emit Redeemed event when redeemToken is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock underlying token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Deploy a mock savings contract
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Fund owner with tokens and approve
    const mintAmount = ethers.parseEther("1000");
    await mockToken.mint(owner.address, mintAmount);
    await mockToken.connect(owner).approve(await instance.getAddress(), mintAmount);
    
    // First supply tokens to get credits
    const supplyAmount = ethers.parseEther("100");
    await instance.connect(owner).supplyTokenTo(supplyAmount, owner.address);
    
    // Now test redeemToken and check for Redeemed event
    const redeemAmount = ethers.parseEther("50");
    
    // Expect the Redeemed event to be emitted
    await expect(
      instance.connect(owner).redeemToken(redeemAmount)
    )
      .to.emit(instance, "Redeemed")
      .withArgs(owner.address, redeemAmount, ethers.parseEther("50")); // actual amount may vary slightly
    
    // Verify balances changed
    const balanceAfter = await mockToken.balanceOf(owner.address);
    expect(balanceAfter).to.be.gt(ethers.parseEther("900")); // original balance - supply + redeemed
  });
});