import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant m42fec968", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) - 100; // 100 seconds in the past
    
    // User deposits with unlockTime in the past
    const txPut = await bank.connect(user).Put(unlockTime, { value: depositAmount });
    await txPut.wait();
    
    // Get the current timestamp from the blockchain
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;
    
    // On original: unlockTime should be set to currentTimestamp (since _unlockTime <= block.timestamp)
    // On mutant: unlockTime may be set to block.prevrandao (random value, likely != currentTimestamp)
    
    // Now attempt to collect after the block timestamp has advanced
    await ethers.provider.send("evm_increaseTime", [10]); // advance time by 10 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect the deposit
    const txCollect = bank.connect(user).Collect(depositAmount);
    
    // On original: should succeed because unlockTime <= block.timestamp (both are timestamps)
    // On mutant: should fail because block.prevrandao is likely much larger than block.timestamp
    await expect(txCollect).to.be.reverted;
  });
});