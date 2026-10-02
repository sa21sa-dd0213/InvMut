import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Kill mutant m8b11ca85 (replaces > with < in Put)", function () {
  it("should prevent withdrawal before unlock time when a future unlock time is set", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Set a future unlock time: 1000 seconds from now
    const futureUnlockTime = (await ethers.provider.getBlock("latest"))!.timestamp + 1000;
    const depositAmount = ethers.parseEther("2");
    
    // Deposit ether with the future unlock time
    const tx = await instance.connect(owner).Put(futureUnlockTime, { value: depositAmount });
    await tx.wait();
    
    // Attempt to collect the deposited amount before the unlock time
    // This should revert because the unlock time hasn't been reached
    // In the mutant, the unlock time would be set to block.timestamp (now), allowing withdrawal
    await expect(
      instance.connect(owner).Collect(depositAmount)
    ).to.be.reverted;
  });
});