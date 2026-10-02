import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42fec968 detection", function () {
  it("should detect mutant by checking unlockTime is set to block.timestamp (not block.prevrandao)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Call Put with _unlockTime = 0 (which is less than current timestamp)
    // In original: unlockTime will be set to block.timestamp
    // In mutant: unlockTime will be set to block.prevrandao (different from timestamp)
    const putTx = await bankInstance.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Get the block where the transaction was mined
    const receipt = await putTx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);

    // Check the stored unlockTime
    const holder = await bankInstance.Acc(addr1.address);
    const storedUnlockTime = holder.unlockTime;

    // In original: storedUnlockTime should equal block.timestamp (the time when tx was mined)
    // In mutant: storedUnlockTime will equal block.prevrandao, which is NOT block.timestamp
    expect(storedUnlockTime).to.equal(block!.timestamp);
  });
});