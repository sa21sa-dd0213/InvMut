import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Kill mutant m2f010c39 (balance >= _am changed to balance <= _am)", function () {
  it("should revert when withdrawing more than deposited balance (original behavior) but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xwallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await xwallet.waitForDeployment();
    
    // Deposit 2 ether from addr1 using Put function
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await xwallet.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Attempt to withdraw 3 ether (more than deposited balance)
    const withdrawAmount = ethers.parseEther("3");
    
    // This should revert in original contract because 2 < 3 (acc.balance >= _am fails)
    // But mutant allows it because 2 <= 3 (acc.balance <= _am passes)
    await expect(
      xwallet.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});