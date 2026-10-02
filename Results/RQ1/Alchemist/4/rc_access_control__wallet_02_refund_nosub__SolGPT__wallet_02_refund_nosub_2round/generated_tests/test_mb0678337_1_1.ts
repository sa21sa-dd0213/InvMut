import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mb0678337 - overflow check removal", function () {
  it("should revert on overflow in deposit with original contract, but mutant allows overflow", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to set initial balance
    const initialDeposit = ethers.parseEther("1");
    await (await instance.connect(owner).deposit({ value: initialDeposit })).wait();

    // Now attempt to deposit an amount that would cause overflow
    // The current balance is 1 ether, so we need to add an amount such that 
    // balance + amount overflows uint256 (max uint256 = 2^256 - 1)
    // balance = 1 * 10^18, so we need amount > 2^256 - 1 - 1 * 10^18
    // Using max uint256 minus current balance plus 1 to trigger overflow
    const maxUint256 = ethers.MaxUint256;
    const overflowAmount = maxUint256 - initialDeposit + BigInt(1);
    
    // This should revert in original contract due to assert, but pass in mutant
    await expect(
      instance.connect(owner).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});