import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test for m42fec968", function () {
  it("should detect mutant that uses block.prevrandao instead of block.timestamp for unlockTime fallback", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get current block timestamp
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock!.timestamp;
    
    // Call Put with _unlockTime = 0 (which should be less than block.timestamp)
    // Original: sets unlockTime to block.timestamp
    // Mutant: sets unlockTime to block.prevrandao (which is different from timestamp)
    const tx = await bank.connect(owner).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();
    
    // Check the stored unlockTime for the owner
    const holder = await bank.Acc(owner.address);
    
    // In the original, unlockTime should equal block.timestamp (the fallback value)
    // In the mutant, unlockTime will be block.prevrandao (different from timestamp)
    expect(holder.unlockTime).to.equal(currentTimestamp);
  });
});