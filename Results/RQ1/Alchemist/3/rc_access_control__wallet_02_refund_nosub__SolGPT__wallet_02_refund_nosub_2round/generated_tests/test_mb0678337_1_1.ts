import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb0678337 by depositing a very small amount and verifying the assertion behavior", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit some ether to establish a non-zero balance
    const depositAmount1 = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount1 });

    // Now deposit the maximum possible amount that would cause overflow in the assertion check
    // We want to trigger the assert condition: balances[msg.sender] + msg.value > balances[msg.sender]
    // If the assertion is removed (mutant), this deposit will succeed but the balance will overflow
    // The maximum safe deposit that would make the assert fail is type(uint256).max - currentBalance + 1
    const currentBalance = await instance.balances(addr1.address);
    const overflowDeposit = ethers.MaxUint256 - currentBalance + 1n;

    // In the original contract, this deposit should revert because the assert condition fails
    // In the mutant (without assert), this deposit would succeed and overflow the balance
    await expect(
      instance.connect(addr1).deposit({ value: overflowDeposit })
    ).to.be.reverted;

    // Verify the balance was not corrupted
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance).to.equal(depositAmount1);
  });
});