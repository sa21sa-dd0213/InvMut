import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mdc40e672 by triggering overflow detection", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit a small amount first to set a non-zero balance
    const smallDeposit = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: smallDeposit });

    // Now deposit an amount that would cause overflow when added to existing balance
    // Current balance = 1 ether = 10^18 wei
    // We want: balance + msg.value > 2^256 - 1 (overflow)
    // msg.value = 2^256 - balance (approximately max uint256 - 10^18)
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await instance.balances(owner.address);
    const overflowAmount = maxUint256 - currentBalance + 1n;

    // This deposit should revert on original (assert catches overflow)
    // but should succeed on mutant (assert always passes, causing silent overflow)
    await expect(
      instance.connect(owner).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});