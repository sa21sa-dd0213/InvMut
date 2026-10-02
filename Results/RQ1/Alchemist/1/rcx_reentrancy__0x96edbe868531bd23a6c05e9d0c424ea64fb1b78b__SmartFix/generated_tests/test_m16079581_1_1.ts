import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m16079581 - Collect success logging", function () {
  it("should detect mutant by verifying Collect event is logged after successful transfer", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Set MinSum, LogFile, and initialize
    const minSum = ethers.parseEther("0.1");
    await instance.SetMinSum(minSum);
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();

    // User puts 1 ETH with 1 second lock time
    const putAmount = ethers.parseEther("1");
    const lockTime = 1;
    await instance.connect(user).Put(lockTime, { value: putAmount });

    // Advance time past unlock
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // User collects 0.5 ETH (meets all conditions)
    const collectAmount = ethers.parseEther("0.5");
    await instance.connect(user).Collect(collectAmount);

    // Check LogFile history for the Collect message
    const historyLength = await logFile.History.length;
    expect(historyLength).to.be.gt(0);

    const lastMessage = await logFile.History(historyLength - 1n);
    expect(lastMessage.Sender).to.equal(await user.getAddress());
    expect(lastMessage.Val).to.equal(collectAmount);
    expect(lastMessage.Data).to.equal("Collect");

    // Verify user received the funds
    const userBalanceAfter = await ethers.provider.getBalance(await user.getAddress());
    expect(userBalanceAfter).to.be.gt(ethers.parseEther("9999")); // initial 10000 + 0.5
  });
});