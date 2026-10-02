import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - supplyTokenTo", function () {
  it("should detect mutant that removes supplyTokenTo implementation by verifying imBalances update", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock savings contract that returns a fixed exchange rate and credits
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the underlying mAsset token address from the savings contract
    const mAssetAddress = await mockSavings.underlying();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund the user with some mAsset tokens
    const supplyAmount = ethers.parseEther("100");
    await mAsset.transfer(user.address, supplyAmount);

    // Approve the yield source to spend user's tokens
    await mAsset.connect(user).approve(await instance.getAddress(), supplyAmount);

    // Call supplyTokenTo - this should update imBalances for the recipient
    const tx = await instance.connect(user).supplyTokenTo(supplyAmount, user.address);
    await tx.wait();

    // Check that imBalances was updated (should be > 0 if implementation works)
    const balance = await instance.imBalances(user.address);

    // If mutant removed the implementation, balance will be 0
    expect(balance).to.be.gt(0);
  });
});