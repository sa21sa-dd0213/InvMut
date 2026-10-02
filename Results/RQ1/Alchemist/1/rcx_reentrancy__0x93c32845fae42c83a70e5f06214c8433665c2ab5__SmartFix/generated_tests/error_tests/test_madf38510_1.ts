import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - madf38510", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    const walletAddress = await walletInstance.getAddress();
    
    // Set MinSum to 0 for easier testing (optional, but helps avoid edge cases)
    // Note: MinSum is 1 ether by default, we'll work with that
    
    // User deposits 2 ether with unlock time set to current block.timestamp + 100 seconds
    const depositAmount = ethers.parseEther("2");
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 100;
    
    await walletInstance.connect(user).Put(futureUnlockTime, { value: depositAmount });
    
    // Verify balance was recorded
    const userAcc = await walletInstance.Acc(user.address);
    expect(userAcc.balance).to.equal(depositAmount);
    expect(userAcc.unlockTime).to.equal(futureUnlockTime);
    
    // Fast-forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [200]); // add 200 seconds
    await ethers.provider.send("evm_mine", []);
    
    // Now attempt to collect 1 ether
    const collectAmount = ethers.parseEther("1");
    
    // On the original contract, this should succeed because block.timestamp > unlockTime
    // On the mutant, this will likely revert because block.prevrandao (random) won't be > unlockTime
    // The test expects a revert to detect the mutant (since it behaves differently)
    await expect(
      walletInstance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});