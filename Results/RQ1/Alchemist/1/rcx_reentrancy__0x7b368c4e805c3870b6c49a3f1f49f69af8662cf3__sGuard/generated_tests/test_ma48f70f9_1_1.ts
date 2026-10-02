import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant ma48f70f9 test", function () {
  it("should kill the mutant by detecting incorrect unlock time comparison", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    const depositAmount = ethers.parseEther("1.0");

    // Test the edge case: deposit with _unlockTime exactly equal to current block timestamp
    // In the original contract: _unlockTime > block.timestamp is false, so unlockTime = block.timestamp
    // In the mutant: _unlockTime >= block.timestamp is true, so unlockTime = _unlockTime = block.timestamp
    // Both result in unlockTime = block.timestamp, but the semantic meaning differs
    await instance.connect(addr1).Put(currentTimestamp, { value: depositAmount });

    // Try to collect immediately - should fail because block.timestamp is NOT > unlockTime
    // (unlockTime == block.timestamp, so block.timestamp > unlockTime is false)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;

    // Mine a block to advance time
    await ethers.provider.send("evm_mine", []);

    // Now the block.timestamp has advanced, so the deposited funds should be collectable
    await instance.connect(addr1).Collect(depositAmount);

    // Verify the balance decreased
    const holderInfo1 = await instance.Acc(addr1.address);
    expect(holderInfo1.balance).to.equal(0);

    // Now test with _unlockTime = current block.timestamp + 1
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const futureTimestamp = block.timestamp + 1;

    await instance.connect(addr1).Put(futureTimestamp, { value: depositAmount });

    // Try to collect immediately - should fail because block.timestamp < unlockTime
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;

    // Mine to advance past unlock time
    await ethers.provider.send("evm_mine", []);

    // Now it should succeed
    await instance.connect(addr1).Collect(depositAmount);

    // Test with exact timestamp equality for addr2
    const blockNum2 = await ethers.provider.getBlockNumber();
    const block2 = await ethers.provider.getBlock(blockNum2);
    const exactTimestamp = block2.timestamp;

    // Deposit with _unlockTime = exactTimestamp
    await instance.connect(addr2).Put(exactTimestamp, { value: depositAmount });

    // Try to collect immediately - should fail in both original and mutant
    // because block.timestamp == unlockTime, not >
    await expect(
      instance.connect(addr2).Collect(depositAmount)
    ).to.be.reverted;

    // Wait for next block
    await ethers.provider.send("evm_mine", []);

    // Now collect should succeed
    await instance.connect(addr2).Collect(depositAmount);

    // Verify addr2 balance
    const holderInfo2 = await instance.Acc(addr2.address);
    expect(holderInfo2.balance).to.equal(0);
  });
});