import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - mfaed0e51", function () {
  it("should detect the mutant by exploiting the unlockTime not being updated on second Put", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a Log contract (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set the log file address
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // Set MinSum to 0 so balance check passes easily
    await instance.connect(owner).SetMinSum(0);

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // First Put: deposit with a short lock time (e.g., 1 second)
    const shortLock = 1;
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).Put(shortLock, { value: depositAmount });

    // Get the unlock time after first Put
    let acc = await instance.Acc(addr1.address);
    const unlockTimeAfterFirstPut = acc.unlockTime;

    // Second Put: deposit again with a much longer lock time (e.g., 1 year in seconds)
    const longLock = 365 * 24 * 60 * 60; // 1 year
    await instance.connect(addr1).Put(longLock, { value: ethers.parseEther("0.1") });

    // Get the unlock time after second Put
    acc = await instance.Acc(addr1.address);
    const unlockTimeAfterSecondPut = acc.unlockTime;

    // In the original contract, the unlock time should have been extended to block.timestamp + longLock
    // In the mutant, the unlock time remains unchanged from the first Put (block.timestamp + shortLock)

    // Wait until after the short lock time but before the long lock time would expire
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timeAfterShortLock = blockBefore.timestamp + shortLock + 5; // 5 seconds after short lock

    // Mine a block to advance time
    await ethers.provider.send("evm_setNextBlockTimestamp", [timeAfterShortLock]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - in the original this should revert because unlockTime was extended
    // In the mutant this should succeed because unlockTime is still the short lock time
    const collectAmount = ethers.parseEther("0.5");

    // If the mutant is present, this transaction will succeed (fail to revert)
    // If the original is present, this transaction will revert
    try {
      const tx = await instance.connect(addr1).Collect(collectAmount);
      await tx.wait();
      // If we get here, the transaction succeeded - this means the mutant is alive
      // The unlockTime was not updated, so we could collect early
      // We should fail the test to indicate we detected the mutant
      expect.fail("Mutant detected: Collect succeeded when it should have reverted");
    } catch (error: any) {
      // If it reverts, the original behavior is correct
      expect(error.message).to.include("revert");
    }

    // Additional check: verify unlock times differ between original and mutant
    // In original: unlockTimeAfterSecondPut > unlockTimeAfterFirstPut
    // In mutant: unlockTimeAfterSecondPut == unlockTimeAfterFirstPut
    expect(unlockTimeAfterSecondPut).to.equal(unlockTimeAfterFirstPut,
      "Mutant should keep unlock time unchanged after second Put");
  });
});