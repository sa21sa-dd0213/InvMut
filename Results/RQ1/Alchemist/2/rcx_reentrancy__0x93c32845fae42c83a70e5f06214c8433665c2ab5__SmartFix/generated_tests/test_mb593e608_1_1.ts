import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Kill mutant mb593e608 (block.timestamp vs block.prevrandao in Put)", function () {
  it("should detect mutant by checking unlockTime when _unlockTime is slightly above current timestamp", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;

    // Set _unlockTime to current timestamp + 10 seconds (slightly in the future)
    const futureUnlockTime = currentTimestamp + 10n;

    // Call Put with some value and future unlock time
    const putValue = ethers.parseEther("1.0");
    const tx = await instance.connect(owner).Put(futureUnlockTime, { value: putValue });
    await tx.wait();

    // Check the stored unlockTime for the owner
    const holder = await instance.Acc(owner.address);

    // In original: unlockTime should be futureUnlockTime (since futureUnlockTime > block.timestamp)
    // In mutant: unlockTime will be block.timestamp (since futureUnlockTime < block.prevrandao)
    // Assert that unlockTime equals the future value (original behavior)
    expect(holder.unlockTime).to.equal(futureUnlockTime);
  });
});