import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42fec968 - block.prevrandao replacement", function () {
  it("should revert on Collect when Put is called with unlockTime <= block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // addr1 calls Put with unlockTime set to current timestamp (not greater than block.timestamp)
    const putTx = await bank.connect(addr1).Put(currentTimestamp, { value: ethers.parseEther("2") });
    await putTx.wait();
    
    // Verify unlockTime was set (should be currentTimestamp in original, but prevrandao in mutant)
    const holder = await bank.Acc(addr1.address);
    console.log("Unlock time set to:", holder.unlockTime.toString());
    console.log("Current block timestamp:", currentTimestamp);
    
    // In the original, unlockTime = block.timestamp (currentTimestamp)
    // In the mutant, unlockTime = block.prevrandao (likely much larger)
    // Try to collect 1 ether - should succeed in original (block.timestamp > unlockTime)
    // Should fail in mutant if prevrandao > block.timestamp
    const collectTx = bank.connect(addr1).Collect(ethers.parseEther("1"));
    
    // In original this should succeed, in mutant it should revert because prevrandao > timestamp
    // We expect revert for the mutant (but not for original)
    // Since we're testing the mutant, we expect revert
    await expect(collectTx).to.be.reverted;
  });
});