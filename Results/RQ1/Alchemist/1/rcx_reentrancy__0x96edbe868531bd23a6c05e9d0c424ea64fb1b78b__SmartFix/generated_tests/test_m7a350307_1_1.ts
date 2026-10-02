import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m7a350307 test", function () {
  it("should detect mutant by verifying unlockTime is not updated when _lockTime is 0 and current unlockTime is in the future", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (needed as constructor argument)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY with LogFile address
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy(await logFile.getAddress());
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 0 for testing purposes
    await instance.connect(owner).SetMinSum(0);

    // Scenario: _lockTime = 2, current timestamp is large
    // Make a Put with huge lockTime to set unlockTime far in future
    await instance.connect(addr1).Put(1000000, { value: ethers.parseEther("1") });
    const holderBefore = await instance.Acc(addr1.address);
    const futureUnlockTime = holderBefore.unlockTime;

    // Now call Put with _lockTime = 2
    // Original: block.timestamp + 2 < futureUnlockTime (since futureUnlockTime is block.timestamp + 1000000)
    // Mutant: block.timestamp * 2 > futureUnlockTime? block.timestamp * 2 = 2*block.timestamp > block.timestamp + 1000000? Only if block.timestamp > 1000000 which is true (current timestamp ~1.7B)
    await instance.connect(addr1).Put(2, { value: ethers.parseEther("0.5") });
    const holderAfter = await instance.Acc(addr1.address);
    const unlockTimeAfter = holderAfter.unlockTime;

    // In original: unlockTime should remain unchanged (futureUnlockTime)
    // In mutant: unlockTime would be updated to block.timestamp + 2 (because the if condition becomes true)
    // We expect unlockTime to NOT change (original behavior)
    expect(unlockTimeAfter).to.equal(futureUnlockTime);
  });
});