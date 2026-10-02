import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m22505dd7 detection", function () {
  it("should detect mutant by attempting Collect after unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Set MinSum to 0 for easier testing (optional, default is 1 ether)
    // We'll work with 1 ether minimum as per contract default
    
    // Deposit 2 ether with unlock time set to current block timestamp + 60 seconds
    const depositAmount = ethers.parseEther("2");
    const futureTime = (await ethers.provider.getBlock("latest")).timestamp + 60;
    
    await instance.connect(addr1).Put(futureTime, { value: depositAmount });
    
    // Verify deposit was recorded
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.unlockTime).to.equal(futureTime);
    
    // Fast forward time past the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime + 10]);
    await ethers.provider.send("evm_mine");
    
    // Attempt to collect 1 ether (should succeed on original, fail on mutant)
    const collectAmount = ethers.parseEther("1");
    
    // This transaction should revert on the mutant (block.timestamp < unlockTime is false)
    // and succeed on the original (block.timestamp > unlockTime is true)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});