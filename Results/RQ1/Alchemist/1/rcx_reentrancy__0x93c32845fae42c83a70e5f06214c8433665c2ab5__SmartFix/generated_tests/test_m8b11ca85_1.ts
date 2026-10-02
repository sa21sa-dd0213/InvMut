import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m8b11ca85 test", function () {
  it("should kill mutant by detecting incorrect unlock time calculation when _unlockTime is in the future", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log contract address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xwallet = await XWalletFactory.deploy(await log.getAddress());
    await xwallet.waitForDeployment();
    
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 1000; // 1000 seconds in the future
    const depositAmount = ethers.parseEther("2");
    
    // Step 1: Deposit with a future unlock time
    await xwallet.connect(addr1).Put(futureUnlockTime, { value: depositAmount });
    
    // Step 2: Attempt to collect immediately (should fail in original, succeed in mutant)
    await expect(
      xwallet.connect(addr1).Collect(depositAmount)
    ).to.be.reverted; // Original reverts because unlockTime > block.timestamp
    
    // Step 3: Verify the unlock time was set incorrectly in mutant
    const holder = await xwallet.Acc(addr1.address);
    expect(holder.unlockTime).to.be.greaterThan(
      Math.floor(Date.now() / 1000)
    ); // In mutant, unlockTime would be block.timestamp, failing this assertion
  });
});