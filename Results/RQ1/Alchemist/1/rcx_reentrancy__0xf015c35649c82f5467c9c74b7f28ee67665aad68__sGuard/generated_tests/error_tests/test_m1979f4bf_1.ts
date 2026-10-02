import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m1979f4bf", function () {
  it("should revert when collecting amount less than MinSum in original, but mutant incorrectly allows it", async function () {
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
    const minSum = await bank.MinSum();
    
    // User deposits less than MinSum (e.g., 0.5 ether when MinSum is 1 ether)
    const depositAmount = minSum / 2n; // 0.5 ether
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is less than MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.balance).to.be.lessThan(minSum);
    
    // Advance time to pass unlockTime (unlockTime is 0 + current block timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect the deposited amount
    // Original contract would revert because balance < MinSum
    // Mutant with <= would incorrectly allow this
    const tx = bank.connect(user).Collect(depositAmount);
    
    // The test expects a revert - this will pass on original but fail on mutant
    await expect(tx).to.be.reverted;
  });
});