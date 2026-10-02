import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - mb8a8967b", function () {
  it("should detect the mutant by checking balance decreases after Collect (mutant adds instead)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("10");
    const withdrawAmount = ethers.parseEther("3");
    
    // Deposit funds
    await wallet.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify initial balance
    let holder = await wallet.Acc(addr1.address);
    const initialBalance = holder.balance;
    expect(initialBalance).to.equal(depositAmount);
    
    // Wait for unlock time (Put with timestamp 0 sets unlockTime = block.timestamp)
    // The unlockTime will be the current block timestamp, so we need to advance time
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Set MinSum to 1 wei so the balance check passes
    // MinSum is already 1 ether, but we can call Collect with _am >= MinSum
    // Actually MinSum = 1 ether, so we need withdrawAmount >= 1 ether (it is 3 ether)
    
    // Call Collect - in original this subtracts, in mutant this adds
    const tx = await wallet.connect(addr1).Collect(withdrawAmount);
    await tx.wait();
    
    // Check balance after Collect
    holder = await wallet.Acc(addr1.address);
    const finalBalance = holder.balance;
    
    // In the original: finalBalance = initialBalance - withdrawAmount
    // In the mutant: finalBalance = initialBalance + withdrawAmount
    // The mutant will fail this assertion because it adds instead of subtracts
    expect(finalBalance).to.equal(initialBalance - withdrawAmount);
  });
});