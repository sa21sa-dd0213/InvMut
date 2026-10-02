import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m8b069bf5 test", function () {
  it("should detect mutant that changed >= to > in balance check against MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const minSum = await bank.MinSum(); // 1 ether
    const depositAmount = minSum; // Exactly 1 ether
    const collectAmount = minSum; // Try to collect the full amount
    
    // Get current timestamp and set unlock time slightly in the future
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const futureUnlock = block!.timestamp + 100;
    
    // Deposit exactly 1 ether (equal to MinSum)
    const tx = await bank.connect(user).Put(futureUnlock, { value: depositAmount });
    await tx.wait();
    
    // Verify balance is exactly MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(minSum);
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureUnlock + 1]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect - should succeed on original but fail on mutant
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});