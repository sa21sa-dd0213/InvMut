import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m0d8d3322 - deposit overflow with >= instead of >", function () {
  it("should revert on overflow with > but pass with >= in deposit assertion", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to set addr1's balance to type(uint256).max - 1
    const maxUint = ethers.MaxUint256;
    const firstDeposit = maxUint - 1n;
    await instance.connect(addr1).deposit({ value: firstDeposit });

    // Now deposit 1 wei to make balance exactly type(uint256).max
    await instance.connect(addr1).deposit({ value: 1n });

    // Now try to deposit again - this will overflow:
    // current balance = type(uint256).max
    // deposit value = type(uint256).max
    // sum = type(uint256).max + type(uint256).max = (2 * type(uint256).max) mod 2^256 = type(uint256).max - 1
    // For original contract: balances[msg.sender] + msg.value > balances[msg.sender]
    // => type(uint256).max - 1 > type(uint256).max => false => assert fails
    // For mutant: >= allows because type(uint256).max - 1 >= type(uint256).max is false,
    // but we need a case where sum equals the original balance after overflow.
    // To get sum == original balance: deposit value = 0, but 0 value deposits are allowed
    // because balances[msg.sender] + 0 = balances[msg.sender] => >= passes on mutant but > fails
    
    // Actually let's test the exact overflow case:
    // Reset: deploy new instance
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // Set balance to type(uint256).max - 1
    await instance2.connect(addr1).deposit({ value: maxUint - 1n });
    // Add 1 to make it max
    await instance2.connect(addr1).deposit({ value: 1n });
    // Now balance = maxUint, deposit maxUint => sum = maxUint - 1 (overflow)
    // Original: (maxUint - 1) > maxUint => false => assert fails => revert
    // Mutant: (maxUint - 1) >= maxUint => false => still reverts. Need different case.
    
    // Correct approach: deposit 0 when balance is already maxUint
    // sum = maxUint + 0 = maxUint => maxUint >= maxUint passes on mutant, but maxUint > maxUint fails on original
    await expect(
      instance2.connect(addr1).deposit({ value: 0n })
    ).to.be.reverted; // This should pass on original (revert), but would fail on mutant (no revert)
  });
});