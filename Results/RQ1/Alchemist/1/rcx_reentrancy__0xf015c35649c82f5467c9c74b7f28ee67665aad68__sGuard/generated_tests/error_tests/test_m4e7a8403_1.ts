import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant m4e7a8403 (Collect timestamp >= instead of >)", function () {
  it("should revert when Collect is called exactly at unlockTime (mutant would allow it)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Send initial deposit with unlockTime set to a future block timestamp
    const currentBlock = await ethers.provider.getBlock("latest");
    const futureTime = currentBlock!.timestamp + 100; // 100 seconds in the future
    const depositAmount = ethers.parseEther("2");
    
    // User deposits 2 ether with unlockTime = currentTime + 100
    await bank.connect(user).Put(futureTime, { value: depositAmount });
    
    // Verify deposit was recorded
    const holderInfo = await bank.connect(user).Acc(user.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    expect(holderInfo.unlockTime).to.equal(futureTime);
    
    // Mine a block to advance time to exactly the unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime]);
    await ethers.provider.send("evm_mine", []);
    
    // Verify we are exactly at unlockTime
    const blockAfterMine = await ethers.provider.getBlock("latest");
    expect(blockAfterMine!.timestamp).to.equal(futureTime);
    
    // Try to collect exactly at unlockTime - should revert in original (>), but mutant (>=) would allow it
    const collectAmount = ethers.parseEther("1");
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted; // Original contract requires strictly greater than unlockTime
    
    // Verify balance remains unchanged (original behavior)
    const holderAfterFailedCollect = await bank.connect(user).Acc(user.address);
    expect(holderAfterFailedCollect.balance).to.equal(depositAmount);
  });
});