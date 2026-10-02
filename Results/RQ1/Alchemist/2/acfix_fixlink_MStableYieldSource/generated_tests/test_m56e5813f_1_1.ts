import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken", function () {
  it("should detect mutant that removes balanceOfToken calculation by asserting balance > 0 after deposit", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock mAsset token (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock mAsset", "mASSET", 18);
    await mAsset.waitForDeployment();

    // Deploy mock SavingsContractV2
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Transfer mAsset to user and approve yield source
    await mAsset.mint(await user.getAddress(), ethers.parseEther("100"));
    await mAsset.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Supply tokens to yield source for user
    const supplyAmount = ethers.parseEther("10");
    await instance.connect(user).supplyTokenTo(supplyAmount, await user.getAddress());

    // Query balanceOfToken - should return > 0 after deposit
    const balance = await instance.balanceOfToken(await user.getAddress());
    expect(balance).to.be.gt(0);
  });
});