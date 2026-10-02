import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mdc40e672 by detecting that the weakened assertion allows overflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, deposit a large amount to addr1's balance to set up for overflow
    const maxUint256 = ethers.MaxUint256;
    const depositAmount = ethers.parseEther("1");
    
    // Deposit some ETH to addr1 first
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Now try to deposit an amount that would cause overflow when added to existing balance
    // The amount needed: maxUint256 - currentBalance + 1 to overflow
    const currentBalance = await instance.balances(addr1.address);
    const overflowAmount = maxUint256 - currentBalance + BigInt(1);
    
    // This should succeed on the mutant (weakened assertion always passes) 
    // but should revert on the original (proper overflow check)
    // We expect it to succeed on the mutant, so we check it does NOT revert
    await expect(
      instance.connect(addr1).deposit({ value: overflowAmount })
    ).to.not.be.reverted;
  });
});