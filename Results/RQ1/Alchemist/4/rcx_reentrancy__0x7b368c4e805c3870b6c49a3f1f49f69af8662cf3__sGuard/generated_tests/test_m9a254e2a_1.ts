import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m9a254e2a", function () {
  it("should kill mutant by calling Collect with insufficient balance and future unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Step 1: Put a small amount (0.5 ether) with unlock time far in the future
    const futureTime = Math.floor(Date.now() / 1000) + 1000000; // ~11.5 days in future
    await wallet.connect(addr1).Put(futureTime, { value: ethers.parseEther("0.5") });
    
    // Step 2: Try to collect more than deposited (1 ether) while unlock time hasn't passed
    // In original: should revert due to balance < MinSum (1 ether) and balance < _am (1 ether) and unlock time not passed
    // In mutant: will succeed because condition is replaced with 'true'
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted; // This should revert in original, pass in mutant - killing it
  });
});