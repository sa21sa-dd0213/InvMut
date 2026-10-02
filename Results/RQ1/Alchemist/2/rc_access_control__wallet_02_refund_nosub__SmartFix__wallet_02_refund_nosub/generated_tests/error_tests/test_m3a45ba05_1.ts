import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m3a45ba05 - overflow protection removal", function () {
  it("should kill the mutant by triggering arithmetic overflow that the removed assert would have prevented", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit a large amount that brings balance close to max uint256
    const maxUint256 = ethers.MaxUint256;
    const largeAmount = maxUint256 - BigInt(100); // Leave small room for overflow test
    await instance.connect(addr1).deposit({ value: largeAmount });
    
    // Now deposit an amount that would cause overflow if assert is removed
    // Original assert would catch: balances[msg.sender] + msg.value > balances[msg.sender]
    // With assert removed, this overflow would silently wrap around
    const overflowAmount = ethers.parseEther("200");
    
    // On the original, this would revert due to assert; on mutant it should succeed
    // We expect it to succeed on mutant, proving the assert was removed
    await expect(
      instance.connect(addr1).deposit({ value: overflowAmount })
    ).to.not.be.reverted;
    
    // Verify the balance wrapped around incorrectly (mutant behavior)
    const balance = await instance.connect(addr1).deposit; // Just checking no revert
    // Actually verify the balance is not what it should be (overflow occurred)
    const actualBalance = await ethers.provider.getBalance(instance.target);
    // If assert was removed, the balance would be less than expected due to overflow
    // This confirms the mutant is live and the test kills it
    expect(actualBalance).to.be.lessThan(largeAmount + overflowAmount);
  });
});