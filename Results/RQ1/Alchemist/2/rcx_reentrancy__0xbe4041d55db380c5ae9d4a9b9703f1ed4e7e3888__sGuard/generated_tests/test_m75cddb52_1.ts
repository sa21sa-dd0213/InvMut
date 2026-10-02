import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m75cddb52 test", function () {
  it("should detect the mutant that replaces block.timestamp with block.prevrandao in Put condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await (await instance.connect(owner).Initialized()).wait();

    // Set MinSum to 0 to allow collecting any amount
    await (await instance.connect(owner).SetMinSum(0)).wait();

    // Deploy a Log contract (needed for LogFile)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set the LogFile address
    await (await instance.connect(owner).SetLogFile(await logInstance.getAddress())).wait();

    // First deposit to create an account with a future unlockTime
    const lockTime = 1000; // 1000 seconds
    await (await instance.connect(addr1).Put(lockTime, { value: ethers.parseEther("1.0") })).wait();

    // Get the unlockTime after first deposit
    const accAfterFirst = await instance.Acc(addr1.address);
    const firstUnlockTime = accAfterFirst.unlockTime;

    // Now call Put with _lockTime = 0 when block.timestamp is less than unlockTime
    // The original contract would NOT update unlockTime because block.timestamp + 0 <= unlockTime
    await (await instance.connect(addr1).Put(0, { value: ethers.parseEther("0.5") })).wait();

    // Get the unlockTime after second deposit
    const accAfterSecond = await instance.Acc(addr1.address);
    const secondUnlockTime = accAfterSecond.unlockTime;

    // In the original contract, unlockTime should remain the same
    // In the mutant, block.prevrandao might be larger, causing unlockTime to be incorrectly updated
    // Therefore we expect unlockTime to be unchanged
    expect(secondUnlockTime).to.equal(firstUnlockTime, 
      "UnlockTime should not change when calling Put(0) while unlockTime is still in the future");
  });
});