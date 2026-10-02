import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m055fca3c detection test", function () {
  it("should detect missing overflow protection in Put function", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Step 1: Make an initial deposit to user's account
    const initialDeposit = ethers.parseEther("1");
    await user.sendTransaction({
      to: bankAddress,
      value: initialDeposit
    });
    
    // Step 2: Get current balance to verify state
    const holderBefore = await bank.Acc(user.address);
    const balanceBefore = holderBefore.balance;
    
    // Step 3: Attempt to deposit an amount that would cause overflow
    // Send max uint256 minus current balance (plus some small amount to ensure overflow)
    const maxUint = ethers.MaxUint256;
    const overflowAmount = maxUint - balanceBefore + 1n;
    
    // In the original contract, this should revert due to overflow check
    // In the mutant, it will succeed and wrap around to a small number
    const tx = user.sendTransaction({
      to: bankAddress,
      value: overflowAmount
    });
    
    // The original would revert, but mutant allows the overflow
    // We expect the transaction to succeed in the mutant
    await expect(tx).to.not.be.reverted;
    
    // Verify the balance has wrapped around (overflow behavior)
    const holderAfter = await bank.Acc(user.address);
    const balanceAfter = holderAfter.balance;
    
    // After overflow: balance should be (balanceBefore + overflowAmount) mod 2^256
    // Which equals (balanceBefore + maxUint - balanceBefore + 1) = 0
    // But due to overflow wrapping, it should be less than initial balance
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});