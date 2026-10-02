import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mbb16f51a test", function () {
  it("should revert when Collect is called exactly at unlockTime (original behavior), but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Put funds with unlock time set to current timestamp (exactly now)
    const putAmount = ethers.parseEther("2");
    await bank.connect(user).Put(currentTimestamp, { value: putAmount });
    
    // Advance to exactly the unlock time (no additional time)
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect exactly at unlock time
    const collectAmount = ethers.parseEther("1");
    
    // This should revert on original (block.timestamp > acc.unlockTime is false when equal)
    // But mutant uses >= so it would succeed - we expect revert to kill mutant
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});