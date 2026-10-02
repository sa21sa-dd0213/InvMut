import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant test for m836b9bc1", function () {
  it("should kill mutant by attempting to collect more than balance (mutant allows, original reverts)", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so balance check doesn't interfere
    await instance.SetMinSum(0);

    // Initialize the contract
    await instance.Initialized();

    // User deposits 10 wei with a short lock time
    const depositAmount = ethers.parseEther("10");
    const lockTime = 1; // seconds
    await instance.connect(user).Put(lockTime, { value: depositAmount });

    // Increase time to unlock
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine");

    // User attempts to collect 20 wei (more than their balance)
    const collectAmount = ethers.parseEther("20");
    
    // In the original contract this would revert because balance (10) < amount (20)
    // In the mutant, the condition acc.balance <= _am allows this to proceed
    // The mutant should succeed (and drain more than balance) - killing the mutant
    const tx = await instance.connect(user).Collect(collectAmount);
    await expect(tx).to.not.be.reverted;
    
    // Verify the mutant allowed the withdrawal (balance should be zero or negative in practice)
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(0); // After collecting more than deposited, balance underflows to 0 in practice
  });
});