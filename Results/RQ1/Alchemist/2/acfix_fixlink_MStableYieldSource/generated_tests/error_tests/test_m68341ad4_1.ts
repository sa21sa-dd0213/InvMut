import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - redeemToken arithmetic", function () {
  it("should kill mutant m68341ad4 by verifying correct arithmetic in redeemToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock mAsset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy mock SavingsContractV2
    const MockSavingsContractV2 = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContractV2.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Mint tokens to user and approve
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(user.address, depositAmount);
    await mAsset.connect(user).approve(await instance.getAddress(), depositAmount);

    // Deposit tokens
    await instance.connect(user).supplyTokenTo(depositAmount, user.address);

    // Get user's imBalance after deposit
    const creditsIssued = await instance.imBalances(user.address);

    // Redeem the same amount
    const balanceBefore = await mAsset.balanceOf(user.address);
    const tx = await instance.connect(user).redeemToken(depositAmount);
    await tx.wait();
    const balanceAfter = await mAsset.balanceOf(user.address);

    const actualReceived = balanceAfter - balanceBefore;

    // The actual received should be approximately equal to depositAmount (within rounding)
    // The mutant would return balanceAfter + balanceBefore which would be much larger
    expect(actualReceived).to.be.closeTo(depositAmount, ethers.parseEther("0.001"));
  });
});