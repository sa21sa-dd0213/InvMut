import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m56e5813f (balanceOfToken calculation removed)", function () {
  it("should return correct balance after supply, detecting mutant that removes calculation", async function () {
    // Get signers
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token to use as mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("Mock MAsset", "mMASS", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();

    // Deploy a mock SavingsContract that implements ISavingsContractV2
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();

    // Deploy MStableYieldSource with the savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();

    // Mint tokens to user and approve the yield source
    const supplyAmount = ethers.parseEther("100");
    await mAsset.mint(await user.getAddress(), supplyAmount);
    await mAsset.connect(user).approve(await instance.getAddress(), supplyAmount);

    // Supply tokens to the yield source for the user
    await instance.connect(user).supplyTokenTo(supplyAmount, await user.getAddress());

    // Call balanceOfToken - if mutant removed calculation, this will return 0 instead of correct value
    const balance = await instance.balanceOfToken(await user.getAddress());

    // The correct balance should be approximately equal to the supply amount
    // (within rounding due to exchange rate)
    expect(balance).to.be.gt(0);
    expect(balance).to.be.closeTo(supplyAmount, ethers.parseEther("1"));
  });
});