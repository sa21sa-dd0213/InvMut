import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test - m03d33714", function () {
  it("should kill the mutant by verifying Collect fails when balance > _am (mutant uses <=)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Deposit 2 ether to user's account with unlock time in the past
    const depositAmount = ethers.parseEther("2");
    const pastTimestamp = 1; // Any timestamp in the past works
    await wallet.connect(user).Put(pastTimestamp, { value: depositAmount });
    
    // Now try to collect 1 ether (balance > _am)
    const collectAmount = ethers.parseEther("1");
    
    // On original: this should succeed (balance >= _am)
    // On mutant: this should fail because condition acc.balance <= _am is false (2 <= 1 is false)
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});