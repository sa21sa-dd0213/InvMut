import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mbd961505 detection", function () {
  it("should detect mutant by verifying future unlock time prevents immediate withdrawal", async function () {
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
    
    // Set minimum sum to 0 for testing (or use 1 ether default)
    // We'll use 1 ether as minimum sum from contract default
    
    // User puts 2 ether with unlock time far in the future (1 year from now)
    const futureTime = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const depositAmount = ethers.parseEther("2");
    
    await bank.connect(user).Put(futureTime, { value: depositAmount });
    
    // Try to collect immediately - should fail on original but succeed on mutant
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.be.reverted;
    
    // Additional verification: check unlock time was set incorrectly in mutant
    const holder = await bank.Acc(user.address);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // In original: unlockTime should be futureTime (since futureTime > block.timestamp)
    // In mutant: unlockTime would be block.timestamp (since futureTime > block.timestamp, so it picks the smaller: block.timestamp)
    // This assertion helps confirm the mutant behavior
    expect(holder.unlockTime).to.equal(futureTime);
  });
});