import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m08c95fbc", function () {
  it("should detect mutant that uses block.prevrandao instead of block.timestamp in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Set unlockTime to currentTimestamp + 100 (in the future)
    const futureUnlockTime = currentTimestamp + 100;
    
    // Call Put with 1 ether and future unlock time
    await instance.connect(addr1).Put(futureUnlockTime, { value: ethers.parseEther("1.0") });
    
    // Verify the unlockTime was set correctly
    const holder = await instance.Acc(addr1.address);
    
    // In the original contract, unlockTime should be futureUnlockTime (since it's > block.timestamp)
    // In the mutant, if block.prevrandao > futureUnlockTime, unlockTime would be block.timestamp instead
    // This would make Collect immediately available, killing the mutant
    expect(holder.unlockTime).to.equal(futureUnlockTime);
    
    // Try to Collect immediately - should revert in original since unlockTime is in future
    // But in mutant, if prevrandao caused unlockTime to be set to block.timestamp, this would succeed
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"), { gasLimit: 100000 })
    ).to.be.reverted;
  });
});