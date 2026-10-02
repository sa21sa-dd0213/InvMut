import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m53d5979e - overflow assertion test", function () {
  it("should revert when depositing amount that would overflow the balance in the original assertion", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the maximum uint256 value
    const maxUint256 = ethers.MaxUint256;
    
    // First deposit to set a base balance
    const baseDeposit = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: baseDeposit });

    // Now deposit an amount that, when added to the existing balance, 
    // would overflow in the original assertion (msg.value + current balance > balance)
    // Original assertion: balances[msg.sender] + msg.value > balances[msg.sender]
    // For overflow: msg.value should be maxUint256 - currentBalance + 1
    const currentBalance = await instance.balances(owner.address);
    const overflowAmount = maxUint256 - currentBalance + BigInt(1);
    
    // In the mutant, the assertion becomes: balances[msg.sender] + msg.value + 1 > balances[msg.sender]
    // This will always be true (since msg.value + 1 > 0), but the actual addition will overflow
    await expect(
      instance.connect(owner).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});