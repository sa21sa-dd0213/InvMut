import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m8fce9ba6", function () {
  it("should detect the mutant that subtracts 1 from msg.value when depositing", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Send exactly 1 wei to the Put function via addr1
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock!.timestamp + 100; // Future unlock time
    
    const tx = await bankInstance.connect(addr1).Put(unlockTime, { value: depositAmount });
    await tx.wait();
    
    // Check the stored balance - should be 1 wei in original, 0 wei in mutant
    const holder = await bankInstance.Acc(addr1.address);
    const storedBalance = holder.balance;
    
    // In the original contract, balance would be 1 wei
    // In the mutant, balance would be 0 wei (1 wei - 1 wei)
    expect(storedBalance).to.equal(depositAmount);
    
    // Additional verification: try to collect the deposited amount
    // Set MinSum to 0 for testing (it's 1 ether by default)
    // We need to check if balance >= MinSum requirement prevents withdrawal
    // Since MinSum is 1 ether and we only deposited 1 wei, we can't withdraw
    // But we can verify the balance discrepancy directly
    
    // The test passes if balance equals the deposited amount (original behavior)
    // The test fails if balance is 0 (mutant behavior)
  });
});