import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant m5deadd9c", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // User deposits exactly 1 wei
    const depositAmount = 1n; // 1 wei
    const tx = await bank.connect(user).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Check user's balance in the contract
    const holder = await bank.Acc(user.address);
    
    // In the original contract, balance should be 1 wei
    // In the mutant (msg.value - 1), balance would be 0 wei
    expect(holder.balance).to.equal(depositAmount);
  });
});