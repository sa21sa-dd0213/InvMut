import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant ma0957166 detection", function () {
  it("should detect the mutant that adds 1 wei extra to balance on Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0"); // 1 ether deposit
    
    // User deposits 1 ether
    await bankInstance.connect(user).Put(0, { value: depositAmount });
    
    // Check the recorded balance in the contract
    const holder = await bankInstance.Acc(user.address);
    
    // In the original contract, balance should equal depositAmount
    // In the mutant, balance = depositAmount + 1 wei
    const expectedBalance = depositAmount + BigInt(1); // Mutant adds 1 wei
    
    // Verify the mutant behavior - balance is one more than deposited
    expect(holder.balance).to.equal(expectedBalance);
    
    // Now try to withdraw exactly the deposited amount
    // In original: should succeed (balance == depositAmount)
    // In mutant: should succeed but leave 1 wei in contract
    
    // Wait for unlock time (set to 0 in Put, so block.timestamp is used)
    // Since unlockTime = block.timestamp, we need to wait one second
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to withdraw the exact deposited amount
    const tx = await bankInstance.connect(user).Collect(depositAmount);
    await tx.wait();
    
    // After withdrawal, check final balance
    const finalHolder = await bankInstance.Acc(user.address);
    
    // In original: balance should be 0
    // In mutant: balance should be 1 wei (since we deposited 1 wei extra)
    expect(finalHolder.balance).to.equal(BigInt(1));
    
    // Also check contract's ether balance - should be 1 wei in mutant
    const contractBalance = await ethers.provider.getBalance(await bankInstance.getAddress());
    expect(contractBalance).to.equal(BigInt(1));
  });
});