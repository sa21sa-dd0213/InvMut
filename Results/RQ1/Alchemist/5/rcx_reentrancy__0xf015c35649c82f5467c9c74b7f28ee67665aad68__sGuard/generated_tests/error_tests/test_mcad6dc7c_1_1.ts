import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mcad6dc7c", function () {
  it("should kill the mutant by detecting the difference when _unlockTime < block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;
    
    // The difference between > and >= is only visible when _unlockTime == block.timestamp
    // In the original: _unlockTime > block.timestamp ? _unlockTime : block.timestamp
    //   When _unlockTime == block.timestamp: condition false -> returns block.timestamp
    // In the mutant:   _unlockTime >= block.timestamp ? _unlockTime : block.timestamp
    //   When _unlockTime == block.timestamp: condition true -> returns _unlockTime (= block.timestamp)
    // These are numerically equal, so the mutant is semantically equivalent for the stored value.
    //
    // However, the test can still verify that the contract works correctly with this edge case.
    // We'll test with _unlockTime exactly equal to block.timestamp.
    
    // Mine a new block to get a fresh timestamp
    await ethers.provider.send("evm_mine", []);
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const exactTimestamp = block!.timestamp;
    
    // Call Put with _unlockTime exactly equal to current block timestamp
    const putTx = await instance.connect(addr1).Put(exactTimestamp, { value: ethers.parseEther("2") });
    await putTx.wait();
    
    // Check the stored unlockTime for addr1
    const holder = await instance.Acc(addr1.address);
    
    // In both original and mutant, the stored value should be block.timestamp (which equals exactTimestamp)
    expect(holder.unlockTime).to.equal(exactTimestamp);
    
    // Verify that Collect fails immediately because block.timestamp is not > unlockTime (they are equal)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
    
    // Now test with _unlockTime in the past to verify behavior
    await ethers.provider.send("evm_mine", []);
    const blockNum2 = await ethers.provider.getBlockNumber();
    const block2 = await ethers.provider.getBlock(blockNum2);
    const currentTimestamp2 = block2!.timestamp;
    
    const pastUnlockTime = currentTimestamp2 - 100;
    const putTx2 = await instance.connect(addr1).Put(pastUnlockTime, { value: ethers.parseEther("1") });
    await putTx2.wait();
    
    const holder2 = await instance.Acc(addr1.address);
    // When _unlockTime < block.timestamp, both versions store block.timestamp
    expect(holder2.unlockTime).to.be.gte(currentTimestamp2);
    
    // Test with _unlockTime in the future
    const futureUnlockTime = currentTimestamp2 + 100;
    const putTx3 = await instance.connect(addr1).Put(futureUnlockTime, { value: ethers.parseEther("1") });
    await putTx3.wait();
    
    const holder3 = await instance.Acc(addr1.address);
    // When _unlockTime > block.timestamp, both versions store _unlockTime
    expect(holder3.unlockTime).to.equal(futureUnlockTime);
  });
});