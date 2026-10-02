import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - Redeemed event emission", function () {
  it("should emit Redeemed event with correct parameters when redeemToken is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Get the underlying mAsset address from the deployed contract
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);
    
    // Mint tokens to addr1 and approve the yield source
    await mAsset.mint(addr1.address, ethers.parseEther("1000"));
    await mAsset.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // First supply tokens to create a balance
    await instance.connect(addr1).supplyTokenTo(ethers.parseEther("500"), addr1.address);
    
    // Now redeem tokens and check for the Redeemed event
    const redeemAmount = ethers.parseEther("100");
    await expect(instance.connect(addr1).redeemToken(redeemAmount))
      .to.emit(instance, "Redeemed")
      .withArgs(addr1.address, redeemAmount, ethers.parseEther("100"));
  });
});