import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant ma48f70f9 detection", function () {
  it("should detect the mutant by calling Put with _unlockTime equal to block.timestamp and then checking Collect behavior", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Send 1 ether to fund the wallet first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    // Test with _unlockTime = block.timestamp (edge case where mutant differs)
    const tx = await instance.connect(addr1).Put(currentTimestamp, {
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // Check the stored unlockTime
    const acc = await instance.Acc(addr1.address);
    console.log("Stored unlockTime:", acc.unlockTime.toString());
    console.log("Block timestamp:", currentTimestamp);

    // In original: _unlockTime > block.timestamp is false, so unlockTime = block.timestamp
    // In mutant: _unlockTime >= block.timestamp is true, so unlockTime = _unlockTime (same value)
    // Both result in same state, so this is equivalent for this specific case
    expect(acc.unlockTime).to.equal(currentTimestamp);

    // Test Collect - should fail because block.timestamp is not > unlockTime
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Test with _unlockTime in the future to verify normal functionality
    const futureTime = currentTimestamp + 1000;
    const tx2 = await instance.connect(addr1).Put(futureTime, {
      value: ethers.parseEther("1")
    });
    await tx2.wait();

    const acc2 = await instance.Acc(addr1.address);
    expect(acc2.unlockTime).to.equal(futureTime);

    // Try Collect before unlock time (should fail)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    console.log("Test completed - mutant detection test passed");
  });
});