import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mfa455904 detection", function () {
  it("should detect mutant by verifying Collect fails after unlock time when it should succeed", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Set up test parameters
    const depositAmount = ethers.parseEther("2");
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future

    // User deposits funds with unlock time in the future
    const txDeposit = await instance.connect(user).Put(futureUnlockTime, {
      value: depositAmount
    });
    await txDeposit.wait();

    // Wait until after the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureUnlockTime + 100]);
    await ethers.provider.send("evm_mine");

    // Try to collect - should succeed on original (timestamp > unlockTime)
    // but should revert on mutant (timestamp < unlockTime is false)
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;

    // Also verify the balance hasn't changed (confirm revert happened)
    const holder = await instance.Acc(await user.getAddress());
    expect(holder.balance).to.equal(depositAmount);
  });

  it("should detect mutant by verifying Collect succeeds before unlock time when it should fail", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Set up test parameters
    const depositAmount = ethers.parseEther("2");
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future

    // User deposits funds
    const txDeposit = await instance.connect(user).Put(futureUnlockTime, {
      value: depositAmount
    });
    await txDeposit.wait();

    // Try to collect before unlock time - should revert on original (timestamp < unlockTime)
    // but should succeed on mutant (timestamp < unlockTime is true)
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});