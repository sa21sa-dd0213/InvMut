import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m0bdb593d", function () {
  it("should detect mutant by checking Collect behavior after unlock time", async function () {
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
    
    // Set unlock time to 1 hour in the future
    const latestBlock = await ethers.provider.getBlock("latest");
    const unlockTime = latestBlock!.timestamp + 3600;
    
    // Deposit exactly 1 ether (MinSum is 1 ether)
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Put(unlockTime, { value: depositAmount });
    
    // Verify balance was recorded
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.unlockTime).to.equal(unlockTime);
    
    // Advance time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    // Verify current block timestamp is past unlock time
    const newBlock = await ethers.provider.getBlock("latest");
    expect(newBlock!.timestamp).to.be.greaterThan(unlockTime);
    
    // Try to collect the full balance
    // On original: should succeed because block.timestamp > unlockTime
    // On mutant: should revert because block.prevrandao is unrelated to time
    const collectTx = bank.connect(user).Collect(depositAmount);
    
    // If mutant is present, this will revert (failing the test if we expect success)
    // If original, it will succeed
    await expect(collectTx).to.not.be.reverted;
    
    // Verify balance decreased
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(0);
  });
});