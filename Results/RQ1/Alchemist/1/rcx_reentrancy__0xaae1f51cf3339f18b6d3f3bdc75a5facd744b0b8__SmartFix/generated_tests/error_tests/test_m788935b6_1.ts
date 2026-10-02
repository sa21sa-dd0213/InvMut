import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK - Kill mutant m788935b6 (remove overflow check)", function () {
  it("should detect missing overflow protection by causing integer overflow in Deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by DEP_BANK constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK with LogFile address as constructor argument
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract - call SetMinSum and SetLogFile, then Initialize
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Get current balance of addr1
    const currentBalance = await instance.balances(addr1.address);
    
    // Calculate the amount needed to cause overflow: 
    // We want (currentBalance + depositAmount) to overflow uint256
    // This means depositAmount = 2^256 - currentBalance
    const MAX_UINT = ethers.MaxUint256;
    const depositAmount = MAX_UINT - currentBalance + 1n;
    
    // On the original contract, this should revert due to the require check
    // On the mutant (which removes the require), this should succeed and cause overflow
    const tx = instance.connect(addr1).Deposit({ value: depositAmount });
    
    // If the contract is the mutant, the transaction will succeed (overflow happens)
    // If the contract is original, it will revert
    // We expect it to succeed on the mutant, so we check for success
    await expect(tx).to.not.be.reverted;
    
    // Verify the balance overflowed - should be very small (wrapped around)
    const newBalance = await instance.balances(addr1.address);
    expect(newBalance).to.equal(depositAmount + currentBalance - (MAX_UINT + 1n));
    
    // The balance should be (currentBalance + depositAmount) % (2^256)
    // Since depositAmount = MAX_UINT - currentBalance + 1, 
    // (currentBalance + depositAmount) = MAX_UINT + 1 = 0
    expect(newBalance).to.equal(0n);
  });
});