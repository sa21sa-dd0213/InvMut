import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m3a45ba05 - deposit overflow protection", function () {
  it("should revert when deposit causes overflow in balances mapping", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Wallet contract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, deposit a large amount to push balance close to max uint256
    // We need to calculate the amount that brings balance to max uint256 - 1
    const maxUint256 = ethers.MaxUint256;
    const initialDeposit = ethers.parseEther("1"); // Start with 1 ETH

    // Deposit initial amount
    let tx = await instance.connect(attacker).deposit({ value: initialDeposit });
    await tx.wait();

    // Calculate how much more we need to reach maxUint256 - 1
    const currentBalance = await instance.balances(attacker.address);
    const amountToMax = maxUint256 - currentBalance - 1n;

    // Deposit to bring balance to maxUint256 - 1
    tx = await instance.connect(attacker).deposit({ value: amountToMax });
    await tx.wait();

    // Verify balance is now maxUint256 - 1
    const finalBalance = await instance.balances(attacker.address);
    expect(finalBalance).to.equal(maxUint256 - 1n);

    // Now deposit 2 wei which should cause overflow (maxUint256 - 1 + 2 = 0 with overflow)
    // In original contract, assert should revert; in mutant, it would silently overflow
    await expect(
      instance.connect(attacker).deposit({ value: 2n })
    ).to.be.reverted;
  });
});