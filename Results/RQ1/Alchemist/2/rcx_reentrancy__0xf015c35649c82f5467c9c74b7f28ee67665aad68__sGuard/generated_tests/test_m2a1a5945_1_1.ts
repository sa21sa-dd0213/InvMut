import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m2a1a5945 detection test", function () {
  it("should detect block.timestamp replaced by block.prevrandao in Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    const bankAddress = await bankInstance.getAddress();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;

    // Set unlock time far in the future (e.g., 1 hour from now)
    const futureUnlockTime = currentTime + 3600;

    // Deposit exactly MinSum (1 ether) with future unlock time
    const minSum = ethers.parseEther("1");
    await bankInstance.connect(user).Put(futureUnlockTime, { value: minSum });

    // Attempt to collect immediately (block.timestamp < unlockTime)
    // In original contract, this should revert because time condition fails
    // In mutant, it uses block.prevrandao which is unrelated to time and may succeed
    const collectTx = bankInstance.connect(user).Collect(minSum);

    // The test: expect revert in original, but mutant might not revert
    // We detect the mutant if the transaction does NOT revert (i.e., it succeeds incorrectly)
    await expect(collectTx).to.be.reverted;
  });
});