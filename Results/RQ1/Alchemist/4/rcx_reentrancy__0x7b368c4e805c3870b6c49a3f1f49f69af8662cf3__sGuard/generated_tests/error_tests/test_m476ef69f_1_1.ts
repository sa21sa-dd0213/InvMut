import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m476ef69f", function () {
  it("should kill mutant that inverts unlock time condition by calling Put with future unlockTime and then immediately attempting Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1");
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    
    // User deposits with future unlock time
    await walletInstance.connect(user).Put(futureTime, { value: depositAmount });
    
    // Immediately try to collect the same amount - should revert on original because unlock time is in future
    // On mutant, this will succeed because mutant sets unlockTime to current time (inverted condition)
    await expect(
      walletInstance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});