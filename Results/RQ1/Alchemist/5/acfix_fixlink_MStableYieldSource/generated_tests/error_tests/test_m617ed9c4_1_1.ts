import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - m617ed9c4", function () {
  it("should detect mutant that removes supplyTokenTo logic by verifying token transfer, balance update, and event emission", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with mock savings contract
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the underlying mAsset token address from the deployed instance
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Transfer some mAsset tokens to addr1 for testing
    const depositAmount = ethers.parseEther("100");
    await mAsset.transfer(addr1.address, depositAmount);

    // Approve MStableYieldSource to spend addr1's tokens
    await mAsset.connect(addr1).approve(await instance.getAddress(), depositAmount);

    // Record balances before
    const addr1BalanceBefore = await mAsset.balanceOf(addr1.address);
    const contractBalanceBefore = await mAsset.balanceOf(await instance.getAddress());
    const imBalanceBefore = await instance.imBalances(addr2.address);

    // Execute supplyTokenTo - this should fail on mutant (empty function body)
    const tx = instance.connect(addr1).supplyTokenTo(depositAmount, addr2.address);

    // Verify that the transaction does NOT revert (original behavior)
    await expect(tx).to.not.be.reverted;

    // Wait for transaction to be mined
    const receipt = await (await tx).wait();

    // Verify token transfer occurred (should fail on mutant)
    const addr1BalanceAfter = await mAsset.balanceOf(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore - depositAmount);

    const contractBalanceAfter = await mAsset.balanceOf(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + depositAmount);

    // Verify imBalances was updated (should fail on mutant)
    const imBalanceAfter = await instance.imBalances(addr2.address);
    expect(imBalanceAfter).to.be.gt(imBalanceBefore);

    // Verify Supplied event was emitted (should fail on mutant)
    await expect(tx).to.emit(instance, "Supplied")
      .withArgs(addr1.address, addr2.address, depositAmount);
  });
});