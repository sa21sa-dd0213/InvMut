import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m3a45ba05 - overflow assertion removal", function () {
  it("should revert when deposit causes overflow (original behavior), but mutant allows overflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give addr1 a large balance to set up overflow condition
    // We need to deposit enough so that adding more would overflow uint256
    const maxUint = ethers.MaxUint256;
    const largeDeposit = maxUint - 1n; // Just below max to set up overflow
    
    // Deposit a very large amount to addr1's balance
    await instance.connect(addr1).deposit({ value: largeDeposit });
    
    // Now try to deposit 2 wei - this should overflow on original (revert) 
    // but succeed on mutant (overflow silently)
    const smallDeposit = 2n;
    
    // On original: assert(balances[msg.sender] + msg.value > balances[msg.sender]) 
    // would be false (maxUint - 1 + 2 > maxUint - 1 is false due to overflow), causing revert
    // On mutant: assertion removed, so deposit succeeds with overflowed balance
    
    await expect(
      instance.connect(addr1).deposit({ value: smallDeposit })
    ).to.be.reverted; // Should revert on original; if mutant, this will fail (test kills mutant)
  });
});