import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m4b6654bd - overflow protection removed", function () {
  it("should detect missing overflow check by causing uint256 overflow", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Step 1: First deposit to set a non-zero balance
    // We'll deposit 1 ether to attacker's account
    const initialDeposit = ethers.parseEther("1");
    await wallet.connect(attacker).Put(0, { value: initialDeposit });
    
    // Step 2: Get current balance and calculate amount needed for overflow
    const currentBalance = (await wallet.Acc(attacker.address)).balance;
    
    // Calculate the amount needed to cause overflow:
    // We want: currentBalance + msg.value to overflow (wrap to a small number)
    // The max uint256 is 2^256 - 1
    const maxUint256 = ethers.MaxUint256;
    
    // We need to send enough to make balance exceed maxUint256
    // So msg.value should be: maxUint256 - currentBalance + 1n
    const overflowAmount = maxUint256 - currentBalance + 1n;
    
    // Step 3: Attempt to cause overflow - on original contract this should revert
    // On mutant (without require check) this should succeed and corrupt the balance
    const tx = wallet.connect(attacker).Put(0, { value: overflowAmount });
    
    // On the mutant, this transaction should NOT revert
    // We expect it to succeed (killing the mutant by detecting the missing check)
    await expect(tx).to.not.be.reverted;
    
    // After the overflow, the balance should be unexpectedly low
    // (due to wraparound: currentBalance + overflowAmount = 0 or small number)
    const newBalance = (await wallet.Acc(attacker.address)).balance;
    
    // The balance should NOT be greater than currentBalance + overflowAmount
    // Because that would overflow, so the actual stored balance is much smaller
    expect(newBalance).to.be.lessThan(currentBalance);
    
    // Additionally, we can verify the balance is the overflow result:
    // (currentBalance + overflowAmount) mod 2^256 = (maxUint256 + 1) mod 2^256 = 0
    // So the balance should be 0 (or close to 0 if there were fees)
    expect(newBalance).to.equal(0n);
  });
});