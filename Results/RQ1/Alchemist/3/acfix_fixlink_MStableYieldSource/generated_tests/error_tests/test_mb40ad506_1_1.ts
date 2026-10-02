import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant mb40ad506", function () {
  it("should revert or return wrong balance when redeemToken is called without updating imBalances", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock savings contract that implements the required interface
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings
    const MStableFactory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableFactory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the underlying mAsset token address from the contract
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund user with mAsset tokens
    const depositAmount = ethers.parseEther("100");
    await mAsset.transfer(user.address, depositAmount);

    // User approves and supplies tokens
    await mAsset.connect(user).approve(await instance.getAddress(), depositAmount);
    await instance.connect(user).supplyTokenTo(depositAmount, user.address);

    // Get initial imBalance for user
    const initialBalance = await instance.imBalances(user.address);

    // Redeem some tokens
    const redeemAmount = ethers.parseEther("50");
    await instance.connect(user).redeemToken(redeemAmount);

    // Get final imBalance for user
    const finalBalance = await instance.imBalances(user.address);

    // The mutant removes the imBalances decrement, so if it's still equal to initial,
    // the mutant is detected (original would have decreased it)
    expect(finalBalance).to.be.lessThan(initialBalance);
  });
});