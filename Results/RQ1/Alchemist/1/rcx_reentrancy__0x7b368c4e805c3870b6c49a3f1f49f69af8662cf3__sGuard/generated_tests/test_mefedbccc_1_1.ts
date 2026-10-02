import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mefedbccc", function () {
  it("should revert when Collect is called but ETH transfer to a reverting recipient fails, and balance should not be deducted", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a malicious contract that reverts on receive
    const RevertingReceiver = await ethers.getContractFactory("RevertingReceiver");
    const revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.waitForDeployment();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Deploy a caller contract that will call Collect and revert on receive
    const CallerContract = await ethers.getContractFactory("TestCaller");
    const caller = await CallerContract.deploy(await instance.getAddress());
    await caller.waitForDeployment();

    // Fund the caller contract
    await owner.sendTransaction({
      to: await caller.getAddress(),
      value: ethers.parseEther("10")
    });

    // Caller puts ETH into wallet with past unlock time
    const currentTime = Math.floor(Date.now() / 1000);
    const pastTime = currentTime - 1000;
    await caller.connect(owner).putFunds(pastTime, ethers.parseEther("5"));

    // Check balance
    const callerBefore = await instance.Acc(await caller.getAddress());
    expect(callerBefore.balance).to.equal(ethers.parseEther("5"));

    // Now caller attempts to collect - its receive function will revert
    // This should fail in the original (balance not deducted) but succeed in mutant (balance deducted)
    await caller.connect(owner).attemptCollect(ethers.parseEther("3"));

    // Check if balance was incorrectly deducted (mutant behavior)
    const callerAfter = await instance.Acc(await caller.getAddress());

    // In original: balance should remain 5 because call reverted
    // In mutant: balance should be 2 because it ignored the revert
    expect(callerAfter.balance).to.equal(ethers.parseEther("5"),
       "Balance should remain unchanged because the ETH transfer to a reverting contract should have failed");
  });
});