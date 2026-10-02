import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - mad482e01", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX - no constructor arguments
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Deploy Log contract - no constructor arguments
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Initialize the system
    await moneyBox.connect(owner).SetLogFile(await log.getAddress());
    await moneyBox.connect(owner).SetMinSum(0);
    await moneyBox.connect(owner).Initialized();
    
    // Send exactly 100 wei via Put function
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await moneyBox.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Check the logged value in the Log contract
    const lastMessage = await log.History(0);
    
    // In the original contract, logged Val should equal depositAmount
    // In the mutant, logged Val would be depositAmount + 1 (msg.value+1)
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});