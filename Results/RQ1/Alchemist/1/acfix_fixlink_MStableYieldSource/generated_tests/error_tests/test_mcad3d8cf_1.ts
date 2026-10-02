import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource - kill mutant mcad3d8cf", function () {
  it("should emit Redeemed event when redeemToken is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock token and savings contract for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Fund the contract with tokens
    const supplyAmount = ethers.parseEther("100");
    await mockToken.transfer(await instance.getAddress(), supplyAmount);
    
    // Approve and call redeemToken
    await mockToken.connect(addr1).approve(await instance.getAddress(), supplyAmount);
    
    // First supply some tokens to have balance to redeem
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Now test redeemToken emits event
    const redeemAmount = ethers.parseEther("50");
    const tx = await instance.connect(addr1).redeemToken(redeemAmount);
    const receipt = await tx.wait();
    
    // Check event was emitted
    await expect(tx)
      .to.emit(instance, "Redeemed")
      .withArgs(addr1.address, redeemAmount, ethers.parseEther("50")); // actual amount may vary slightly due to exchange rate
  });
});