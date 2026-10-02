import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m6c33583f test", function () {
  it("should kill mutant by verifying unlockTime is updated when new lock time is later", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX - no constructor arguments needed
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();

    // First Put with a 100-second lock time
    const initialLockTime = 100;
    const tx1 = await instance.connect(user).Put(initialLockTime, { value: ethers.parseEther("1.0") });
    await tx1.wait();

    // Get the unlock time after first deposit
    let acc = await instance.Acc(user.address);
    const firstUnlockTime = acc.unlockTime;

    // Second Put with a longer lock time (200 seconds) - should extend unlockTime
    const longerLockTime = 200;
    const tx2 = await instance.connect(user).Put(longerLockTime, { value: ethers.parseEther("0.5") });
    await tx2.wait();

    // Get the unlock time after second deposit
    acc = await instance.Acc(user.address);
    const secondUnlockTime = acc.unlockTime;

    // In the original contract, the unlock time should be extended
    // In the mutant (with < instead of >), the unlock time would NOT be updated
    // because the new time (block.timestamp + 200) is GREATER than the existing one,
    // and the mutant only updates when the new time is LESS than the existing one
    expect(secondUnlockTime).to.be.gt(firstUnlockTime);
  });
});