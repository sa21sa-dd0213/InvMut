import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant mcad3d8cf (remove Redeemed event emission)", function () {
  it("should emit Redeemed event when redeemToken is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    // Deploy mock SavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Mint tokens to owner and approve
    const mintAmount = ethers.parseEther("1000");
    await mockToken.mint(owner.address, mintAmount);
    await mockToken.connect(owner).approve(await instance.getAddress(), mintAmount);

    // First supply some tokens to have balance
    const supplyAmount = ethers.parseEther("500");
    await instance.connect(owner).supplyTokenTo(supplyAmount, owner.address);

    // Now redeem and check for Redeemed event
    const redeemAmount = ethers.parseEther("100");
    const tx = await instance.connect(owner).redeemToken(redeemAmount);
    const receipt = await tx.wait();

    // Check that Redeemed event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Redeemed")
      .withArgs(owner.address, redeemAmount, ethers.parseEther("100")); // actual amount may vary slightly due to exchange rate
  });
});