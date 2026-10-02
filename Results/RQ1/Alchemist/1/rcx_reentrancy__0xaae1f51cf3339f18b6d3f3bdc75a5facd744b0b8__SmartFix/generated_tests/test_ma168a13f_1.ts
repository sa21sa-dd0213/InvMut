import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant detection test - ma168a13f", function () {
  it("should detect the mutant by exploiting overflow vulnerability in Deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (needed as constructor argument for DEP_BANK)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK with LogFile address
    const DEP_BANKFactory = await ethers.getContractFactory("DEP_BANK");
    const bank = await DEP_BANKFactory.deploy(await logFile.getAddress());
    await bank.waitForDeployment();
    
    // Initialize the contract
    await bank.connect(owner).Initialized();
    
    // Set MinSum to 0 to allow withdrawals
    await bank.connect(owner).SetMinSum(0);
    
    // First deposit to set user's balance near overflow threshold
    // uint256 max is 2^256 - 1 = ~1.15e77
    // We'll deposit enough so that balance + next deposit would overflow
    const maxUint = ethers.MaxUint256;
    const firstDeposit = maxUint - BigInt(1); // Balance becomes 2^256 - 2
    await bank.connect(user).Deposit({ value: firstDeposit });
    
    // Now deposit 2 wei - this would cause overflow in original (balance + 2 > max)
    // Original: require((balance + 2) >= balance) => requires no overflow => REVERTS
    // Mutant: require((balance + 2 + 1) >= balance) => always true => PASSES
    const secondDeposit = BigInt(2);
    
    // In original contract this should revert due to overflow check
    // In mutant it will pass (the +1 makes condition always true)
    await expect(
      bank.connect(user).Deposit({ value: secondDeposit })
    ).to.be.reverted;
  });
});