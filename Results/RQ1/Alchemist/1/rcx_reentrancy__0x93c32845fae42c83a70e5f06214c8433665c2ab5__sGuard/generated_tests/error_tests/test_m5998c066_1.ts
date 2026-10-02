import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant m5998c066 test", function () {
  it("should fail on mutant when block.prevrandao prevents collect after unlock time passed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Set a past unlock time (e.g., block.timestamp - 100 seconds)
    const latestBlock = await ethers.provider.getBlock("latest");
    const pastUnlockTime = latestBlock.timestamp - 100n;
    
    // Deposit 2 ether from addr1 with past unlock time
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(pastUnlockTime, { value: depositAmount });
    
    // Verify balance is set
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Now attempt to collect 1 ether
    const collectAmount = ethers.parseEther("1");
    
    // This should succeed on original (block.timestamp > unlockTime is true)
    // On mutant, block.prevrandao may be <= unlockTime, causing revert
    const tx = instance.connect(addr1).Collect(collectAmount);
    
    // The mutant will revert because block.prevrandao is unrelated to time
    // and likely less than or equal to the past unlock time
    await expect(tx).to.be.reverted;
  });
});