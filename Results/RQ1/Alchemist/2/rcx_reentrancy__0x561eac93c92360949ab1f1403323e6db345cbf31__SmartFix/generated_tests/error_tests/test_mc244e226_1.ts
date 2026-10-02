import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mc244e226 test", function () {
  it("should detect mutant by causing overflow with max uint256 deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to allow Collect later if needed
    await instance.SetMinSum(0);
    await instance.Initialized();

    // First deposit to set a non-zero balance
    const initialDeposit = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialDeposit
    });

    // Calculate the amount needed to make balance + deposit = 2^256 - 1
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await instance.balances(owner.address);
    const depositAmount = maxUint256 - currentBalance;

    // This should pass on original (no overflow) but fail on mutant (overflow due to +1)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: depositAmount
      })
    ).to.be.reverted;
  });
});