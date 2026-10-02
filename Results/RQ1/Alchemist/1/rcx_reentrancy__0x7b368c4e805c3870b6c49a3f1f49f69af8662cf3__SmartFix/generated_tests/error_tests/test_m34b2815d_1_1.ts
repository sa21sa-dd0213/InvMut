import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m34b2815d", function () {
  it("should revert on Collect when _unlockTime equals block.timestamp (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block.timestamp;

    // Call Put with _unlockTime exactly equal to current timestamp
    const putAmount = ethers.parseEther("2");
    const putTx = await instance.connect(addr1).Put(currentTimestamp, { value: putAmount });
    await putTx.wait();

    // Now try to Collect with amount less than balance
    // Original contract requires block.timestamp > unlockTime (strictly greater)
    // Since we set unlockTime = block.timestamp, this should fail in original
    const collectAmount = ethers.parseEther("1");

    // Mine a new block with same timestamp (to ensure we're at the same time)
    await ethers.provider.send("evm_mine", [currentTimestamp]);

    // This should revert because block.timestamp is NOT strictly greater than unlockTime
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});