import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant test - kill m36b0aaa1", function () {
  it("should revert when balance is sufficient but unlock time has not passed (original), but mutant would incorrectly allow withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;
    
    // Set unlock time far in the future (so it hasn't passed)
    const futureUnlockTime = currentTime + 100000;
    
    // Send 2 ether to the contract via Put() to set balance >= MinSum (1 ether)
    // This also sets the unlockTime to futureUnlockTime
    const putTx = await wallet.connect(addr1).Put(futureUnlockTime, { value: ethers.parseEther("2") });
    await putTx.wait();
    
    // Now try to Collect 1 ether - should revert because block.timestamp < unlockTime
    // In the original: condition requires all three &&, so time check fails -> revert
    // In the mutant: condition uses ||, so if balance >= MinSum && balance >= _am is true,
    // the overall condition becomes true even though time hasn't passed, allowing withdrawal
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});