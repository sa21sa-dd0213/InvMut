import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m08c95fbc detection test", function () {
  it("should detect mutant by allowing early withdrawal when it shouldn't", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlock("latest");
    const currentTime = blockNumBefore!.timestamp;
    
    // Set unlock time far in the future (e.g., current time + 1 hour)
    const futureUnlock = currentTime + 3600;
    
    // User deposits 2 ether with a future unlock time
    const depositAmount = ethers.parseEther("2");
    await bank.connect(user).Put(futureUnlock, { value: depositAmount });
    
    // Verify balance was recorded
    const holderInfo = await bank.Acc(user.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Attempt to collect 1 ether immediately (should fail on original, succeed on mutant)
    const collectAmount = ethers.parseEther("1");
    
    // The mutant uses block.prevrandao instead of block.timestamp in the unlock time calculation.
    // block.prevrandao is a random value that will likely be less than futureUnlock,
    // causing the fallback to block.timestamp (current time), making funds immediately available.
    // On the original, block.timestamp < futureUnlock, so the unlock time stays as futureUnlock,
    // and the collection reverts because block.timestamp is not > acc.unlockTime.
    
    // We expect the transaction to succeed on the mutant (detecting the bug)
    // but revert on the original. Since we're testing the mutant, we check it succeeds.
    const tx = await bank.connect(user).Collect(collectAmount);
    await tx.wait();
    
    // If we reach here, the mutant allowed early withdrawal - test passes (kills mutant)
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(depositAmount - collectAmount);
  });
});