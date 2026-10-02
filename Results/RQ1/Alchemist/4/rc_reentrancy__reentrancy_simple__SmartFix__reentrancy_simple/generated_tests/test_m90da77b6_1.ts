import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m90da77b6 - overflow require removal", function () {
  it("should revert when adding to balance would cause overflow on original, but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current balance of owner (initially 0)
    const initialBalance = await instance.getBalance(owner.address);
    expect(initialBalance).to.equal(0);

    // Calculate the maximum uint256 value
    const maxUint256 = ethers.MaxUint256;
    
    // Send value that would cause overflow: current balance (0) + value > maxUint256
    // Since current balance is 0, any value will not overflow. We need to first add some balance
    // then attempt an overflow.
    
    // First, add a small amount to have a non-zero balance
    const smallAmount = ethers.parseEther("1");
    await (await instance.addToBalance({ value: smallAmount })).wait();
    
    // Now balance is 1 ether. To overflow, we need to send (maxUint256 - 1 ether + 1)
    const overflowAmount = maxUint256 - smallAmount + 1n;
    
    // On original contract this would revert due to require check
    // On mutant it would succeed and corrupt balance
    // We expect the transaction to revert on the original (which is the mutant in this test)
    // Actually, since we are testing the mutant, we expect it to NOT revert
    // So we check that it succeeds (which would kill the mutant because original would revert)
    
    // We'll attempt the overflow transaction
    const tx = instance.addToBalance({ value: overflowAmount });
    
    // On the original contract, this would revert
    // On the mutant, it should succeed
    // Since we are testing the mutant, we expect success (which kills the mutant)
    await expect(tx).to.not.be.reverted;
    
    // After the transaction, balance should be corrupted (wrapped around)
    const newBalance = await instance.getBalance(owner.address);
    // Expected: 1 ether + overflowAmount wraps to (1 + overflowAmount) % 2^256
    // Since overflowAmount = maxUint256 - 1 ether + 1 = (2^256 - 1) - 1 ether + 1 = 2^256 - 1 ether
    // So 1 ether + (2^256 - 1 ether) = 2^256, which wraps to 0
    expect(newBalance).to.equal(0);
  });
});