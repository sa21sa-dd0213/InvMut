import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test", function () {
  it("should kill mutant mb40ad506 by testing redeemToken balance changes", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock mAsset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy mock savings contract
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Mint tokens to user and approve
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(user.address, depositAmount);
    await mAsset.connect(user).approve(await instance.getAddress(), depositAmount);

    // First supply tokens to get some imBalances
    await instance.connect(user).supplyTokenTo(depositAmount, user.address);

    // Get initial balances
    const initialUserBalance = await mAsset.balanceOf(user.address);
    const initialImBalance = await instance.imBalances(user.address);

    // Now redeem - this should fail on mutant since implementation is removed
    const redeemAmount = ethers.parseEther("10");
    await instance.connect(user).redeemToken(redeemAmount);

    // Get final balances
    const finalUserBalance = await mAsset.balanceOf(user.address);
    const finalImBalance = await instance.imBalances(user.address);

    // On original: user gets tokens back and imBalance decreases
    // On mutant: nothing happens, so these assertions will fail
    expect(finalUserBalance).to.be.gt(initialUserBalance);
    expect(finalImBalance).to.be.lt(initialImBalance);
  });
});