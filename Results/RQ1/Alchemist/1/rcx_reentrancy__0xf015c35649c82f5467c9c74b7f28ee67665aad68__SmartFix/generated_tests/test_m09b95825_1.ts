import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m09b95825 detection", function () {
  it("should detect the mutated Collect function that uses < instead of > for timestamp check", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");
    
    // Set unlock time to 1 hour in the future from now
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const futureUnlockTime = currentTime + 3600; // 1 hour from now
    
    // Deposit funds with future unlock time
    await bank.connect(user).Put(futureUnlockTime, { value: depositAmount });
    
    // Verify balance was added
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.unlockTime).to.equal(futureUnlockTime);
    
    // Fast-forward time past the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureUnlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to withdraw - should succeed on original (timestamp > unlockTime)
    // but fail on mutant (timestamp < unlockTime is false after unlock time passed)
    await expect(
      bank.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});