import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - supplyTokenTo token transfer", function () {
  it("should revert when calling supplyTokenTo without token approval (mutant removed safeTransferFrom)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy a mock savings contract that implements the required interface
    const MockSavingsV2 = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsV2.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock contracts
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Give addr1 some tokens and approve the yield source to spend them
    const transferAmount = ethers.parseEther("100");
    await mockToken.transfer(addr1.address, transferAmount);

    // addr1 approves the yield source to spend tokens (this should be present in original)
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Record balances before the call
    const addr1BalanceBefore = await mockToken.balanceOf(addr1.address);
    const contractBalanceBefore = await mockToken.balanceOf(await instance.getAddress());

    // Call supplyTokenTo - in the mutant, safeTransferFrom is removed
    // so the contract will try to deposit tokens it doesn't have
    await expect(
      instance.connect(addr1).supplyTokenTo(transferAmount, addr1.address)
    ).to.be.reverted;

    // Verify balances didn't change (mutant would have deposited without transferring)
    const addr1BalanceAfter = await mockToken.balanceOf(addr1.address);
    const contractBalanceAfter = await mockToken.balanceOf(await instance.getAddress());

    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});