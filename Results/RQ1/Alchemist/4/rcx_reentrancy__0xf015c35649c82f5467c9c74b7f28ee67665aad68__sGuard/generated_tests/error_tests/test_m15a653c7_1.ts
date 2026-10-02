import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m15a653c7 test", function () {
  it("should detect the mutant by depositing 1 ether and withdrawing exactly 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get current block timestamp to set unlock time
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;
    
    // Deposit exactly 1 ether with unlock time = current time (so it's immediately available)
    const depositAmount = ethers.parseEther("1");
    await bank.connect(addr1).Put(currentTime, { value: depositAmount });
    
    // Check balance stored (in mutant it will be 1 ether + 1 wei)
    const accInfo = await bank.Acc(addr1.address);
    const storedBalance = accInfo.balance;
    
    // Try to withdraw exactly 1 ether
    const tx = bank.connect(addr1).Collect(depositAmount);
    
    // On the original contract, this should succeed because balance >= 1 ether
    // On the mutant, balance is 1 ether + 1 wei, so withdraw of 1 ether should still succeed
    // But the real detection: after withdrawal, check the remaining balance
    await (await tx).wait();
    
    const accInfoAfter = await bank.Acc(addr1.address);
    const remainingBalance = accInfoAfter.balance;
    
    // On original: 1 ether - 1 ether = 0
    // On mutant: (1 ether + 1 wei) - 1 ether = 1 wei
    // So the remaining balance should be 0 on original, but 1 wei on mutant
    expect(remainingBalance).to.equal(0);
  });
});