import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection", function () {
  it("should detect mutant that changes subtraction to addition in redeemToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock mAsset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Mint tokens to user and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(user.address, depositAmount);
    await mAsset.connect(user).approve(await savings.getAddress(), depositAmount);

    // Deploy the MStableYieldSource contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await Factory.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();

    // User approves yield source to spend mAssets
    await mAsset.connect(user).approve(await yieldSource.getAddress(), depositAmount);

    // User supplies tokens
    await yieldSource.connect(user).supplyTokenTo(depositAmount, user.address);

    // Now redeem the same amount
    const tx = await yieldSource.connect(user).redeemToken(depositAmount);
    const receipt = await tx.wait();

    // The actual amount redeemed should be approximately equal to depositAmount (not double)
    // We can check the event emitted
    const event = receipt.logs.find(
      (log: any) => log.eventName === "Redeemed"
    );

    if (event) {
      const actualAmount = event.args.actualAmount;
      // If mutant changed - to +, actualAmount would be ~2 * depositAmount
      // Original would give ~depositAmount
      expect(actualAmount).to.be.closeTo(depositAmount, ethers.parseEther("1"));
      expect(actualAmount).to.be.lessThan(depositAmount * 2n);
    }

    // Also verify user received correct amount via balance check
    const userBalance = await mAsset.balanceOf(user.address);
    expect(userBalance).to.be.closeTo(depositAmount, ethers.parseEther("1"));
    expect(userBalance).to.be.lessThan(depositAmount * 2n);
  });
});