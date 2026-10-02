import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m617ed9c4", function () {
  it("should revert when supplyTokenTo is called without transferring tokens to contract", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns the underlying token
    const MockSavings = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the mAsset token address from the deployed instance
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Give addr1 some mAsset tokens
    const mintAmount = ethers.parseEther("100");
    // Assuming the mAsset has a mint function for testing
    // For this test, we need to ensure addr1 has tokens and has approved the contract

    // First, check initial balances
    const initialAddr1Balance = await mAsset.balanceOf(addr1.address);
    const initialContractBalance = await mAsset.balanceOf(instance.getAddress());

    // Call supplyTokenTo - if mutant is present, it won't transfer tokens
    // This should fail because the savings contract won't have tokens to deposit
    await expect(
      instance.connect(addr1).supplyTokenTo(ethers.parseEther("10"), addr1.address)
    ).to.be.reverted;

    // Approve the contract to spend addr1's tokens
    await mAsset.connect(addr1).approve(instance.getAddress(), ethers.parseEther("100"));

    // Now call supplyTokenTo
    await instance.connect(addr1).supplyTokenTo(ethers.parseEther("10"), addr1.address);

    // After the call, check that tokens were transferred from addr1 to contract
    const finalAddr1Balance = await mAsset.balanceOf(addr1.address);
    const finalContractBalance = await mAsset.balanceOf(instance.getAddress());

    // In the original contract, addr1's balance should decrease by 10 tokens
    // In the mutant, addr1's balance would remain unchanged
    expect(finalAddr1Balance).to.equal(initialAddr1Balance - ethers.parseEther("10"));
    expect(finalContractBalance).to.equal(initialContractBalance + ethers.parseEther("10"));
  });
});