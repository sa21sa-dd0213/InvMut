import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test mb5b7293c", function () {
  it("should detect replacement of block.timestamp with block.prevrandao in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so that Collect can succeed if conditions are met
    await (await instance.SetMinSum(0)).wait();

    // Set LogFile (any address, since we're not testing logging)
    await (await instance.SetLogFile(owner.address)).wait();

    // Initialize the contract
    await (await instance.Initialized()).wait();

    // Call Put with a lock time of 1 hour (3600 seconds)
    const lockTime = 3600;
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    await tx.wait();

    // Get the current block timestamp after the Put transaction
    const blockAfterPut = await ethers.provider.getBlock(tx.blockNumber);
    const expectedUnlockTime = blockAfterPut.timestamp + lockTime;

    // Get the actual unlockTime stored in the contract
    const holder = await instance.Acc(addr1.address);
    const actualUnlockTime = holder.unlockTime;

    // The unlockTime should be based on block.timestamp, not block.prevrandao
    // block.prevrandao is typically a large random number, so if it was used,
    // the actualUnlockTime would likely be much larger than expected
    expect(actualUnlockTime).to.equal(expectedUnlockTime);

    // Now try to collect immediately - should fail because funds are still locked
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;

    // If the mutant used block.prevrandao, the unlockTime might be much larger
    // causing the Collect to revert differently, or the comparison above would fail
    // This test kills the mutant by checking the exact unlockTime calculation
  });
});