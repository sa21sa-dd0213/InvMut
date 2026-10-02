import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m08c95fbc test", function () {
  it("should detect the block.timestamp vs block.prevrandao mutation in Put function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    const bankAddress = await bankInstance.getAddress();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Set unlock time far in the future (current time + 100000 seconds)
    const futureUnlockTime = currentTimestamp + 100000;

    // Deposit 2 ether with future unlock time
    const depositAmount = ethers.parseEther("2");
    const minSum = ethers.parseEther("1");

    await bankInstance.connect(user).Put(futureUnlockTime, { value: depositAmount });

    // Immediately try to collect - should revert on original because unlockTime is in the future
    // On the mutant, block.prevrandao might be larger than futureUnlockTime, 
    // causing unlockTime to be set to current timestamp, allowing immediate withdrawal
    await expect(
      bankInstance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});