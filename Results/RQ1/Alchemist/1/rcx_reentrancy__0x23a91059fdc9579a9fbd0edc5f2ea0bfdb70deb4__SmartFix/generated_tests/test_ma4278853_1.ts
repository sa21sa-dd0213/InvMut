import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant ma4278853 - overflow protection removed", function () {
  it("should revert when deposit causes overflow (original has require check, mutant does not)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get the minimum deposit amount
    const minDeposit = await bank.MinDeposit();
    
    // First make a normal deposit to set a non-zero balance
    await bank.connect(owner).Deposit({ value: minDeposit });
    
    // Get current balance
    const currentBalance = await bank.balances(owner.address);
    
    // Calculate the amount needed to cause overflow: 
    // We need currentBalance + depositAmount to exceed type(uint256).max
    const maxUint = ethers.MaxUint256;
    const overflowAmount = maxUint - currentBalance + 1n;
    
    // In the original contract, this deposit should revert due to overflow check
    // In the mutant (without the require), it would succeed but with wrapped balance
    await expect(
      bank.connect(owner).Deposit({ value: overflowAmount })
    ).to.be.reverted;
    
    // If the test passes (reverts), the original contract behavior is verified
    // If the mutant allows the deposit without reverting, this test will fail
  });
});