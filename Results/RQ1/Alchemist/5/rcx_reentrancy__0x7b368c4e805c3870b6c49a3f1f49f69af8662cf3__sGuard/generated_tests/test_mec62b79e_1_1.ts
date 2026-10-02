import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mec62b79e - kill test", function () {
  it("should detect mutant by testing Collect after Put with past unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get the MinSum (1 ether) from contract
    const minSum = await instance.MinSum();

    // Put with _unlockTime = 0 (past timestamp) and deposit MinSum
    const depositAmount = minSum;
    const txPut = await instance.connect(addr1).Put(0, { value: depositAmount });
    await txPut.wait();

    // Check balance after Put
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Now try to Collect the full amount
    // On original: unlockTime = max(0, block.timestamp) = block.timestamp, so block.timestamp > unlockTime is false initially
    // But we need to advance time so block.timestamp > unlockTime
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;

    // The unlockTime was set to currentTime (since _unlockTime=0 < currentTime)
    // We need to advance time by at least 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Now try to Collect - on original it should succeed, on mutant it should fail
    // because mutant uses block.prevrandao which is unrelated to timestamp
    const txCollect = await instance.connect(addr1).Collect(depositAmount);

    // Check if the collect succeeded or reverted
    // On original: should succeed
    // On mutant: likely fails because unlockTime is set based on prevrandao (not timestamp)
    await expect(txCollect).to.not.be.reverted;

    // Verify balance decreased
    const holderAfter = await instance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(0);
  });
});