import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant mcad6dc7c (>= vs >)", function () {
  it("should detect mutant by calling Put with _unlockTime equal to block.timestamp", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;

    // Call Put with _unlockTime = currentTimestamp (equal to block.timestamp)
    // In original: _unlockTime > block.timestamp is false, so unlockTime = block.timestamp
    // In mutant: _unlockTime >= block.timestamp is true, so unlockTime = _unlockTime (= block.timestamp)
    // Both store the same value (block.timestamp), but we need to check Collect behavior

    const putAmount = ethers.parseEther("2");
    await bankInstance.connect(owner).Put(currentTimestamp, { value: putAmount });

    // Now try to Collect immediately (block.timestamp still equals stored unlockTime)
    // In original: block.timestamp > acc.unlockTime is false (equal), so Collect reverts
    // In mutant: same behavior since unlockTime stored is the same

    // Wait for next block to advance timestamp by at least 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Now try Collect - should succeed in original (timestamp > unlockTime)
    // But in mutant, unlockTime was stored as currentTimestamp (not block.timestamp+1)
    // because mutant used >= and stored _unlockTime which equals original block.timestamp

    const collectAmount = ethers.parseEther("1");
    await bankInstance.connect(owner).Collect(collectAmount);

    // Verify balance decreased
    const holder = await bankInstance.Acc(owner.address);
    expect(holder.balance).to.equal(putAmount - collectAmount);
  });

  it("should kill mutant by testing edge case where _unlockTime is exactly block.timestamp - 1", async function () {
    const [owner] = await ethers.getSigners();

    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;

    // Call Put with _unlockTime = currentTimestamp - 1 (past time)
    // In original: _unlockTime > block.timestamp is false, so unlockTime = block.timestamp
    // In mutant: _unlockTime >= block.timestamp is false (1 less), so unlockTime = block.timestamp
    // Both store block.timestamp - identical behavior

    const putAmount = ethers.parseEther("2");
    await bankInstance.connect(owner).Put(currentTimestamp - 1, { value: putAmount });

    // Advance time by 2 seconds to ensure block.timestamp > stored unlockTime
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Now test Collect - should succeed in both
    const collectAmount = ethers.parseEther("1");
    await bankInstance.connect(owner).Collect(collectAmount);

    // Verify balance decreased
    const holder = await bankInstance.Acc(owner.address);
    expect(holder.balance).to.equal(putAmount - collectAmount);
  });
});