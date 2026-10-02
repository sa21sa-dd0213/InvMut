import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m03d33714 test", function () {
  it("should kill mutant by withdrawing amount greater than balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const walletAddress = await instance.getAddress();
    
    // addr1 deposits exactly 1 ether (MinSum) with unlock time in the past
    const depositAmount = ethers.parseEther("1");
    const pastTimestamp = 1; // far in the past to ensure unlock
    await instance.connect(addr1).Put(pastTimestamp, { value: depositAmount });
    
    // Try to withdraw 2 ether (more than balance)
    const withdrawAmount = ethers.parseEther("2");
    
    // On original: should revert because balance (1) < withdraw amount (2)
    // On mutant: condition acc.balance <= _am is true (1 <= 2), so it would succeed
    // This test expects revert, killing the mutant if it doesn't revert
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});