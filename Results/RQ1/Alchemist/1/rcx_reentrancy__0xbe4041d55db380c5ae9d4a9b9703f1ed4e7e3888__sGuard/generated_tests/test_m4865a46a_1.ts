import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m4865a46a", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const MONEY_BOX_Factory = await ethers.getContractFactory("MONEY_BOX");
    const LogFactory = await ethers.getContractFactory("Log");
    
    // Deploy Log first, then MONEY_BOX
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    const moneyBox = await MONEY_BOX_Factory.deploy();
    await moneyBox.waitForDeployment();
    
    // Set the LogFile address
    await moneyBox.connect(owner).SetLogFile(await logContract.getAddress());
    // Initialize the contract
    await moneyBox.connect(owner).Initialized();
    
    // Send exactly 1 wei via Put function
    const sendAmount = 1n;
    const tx = await moneyBox.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Check the last message in Log's History
    const lastMsg = await logContract.History(0);
    
    // In original: lastMsg.Val should equal sendAmount (1)
    // In mutant: lastMsg.Val will be sendAmount - 1 = 0
    expect(lastMsg.Val).to.equal(sendAmount);
  });
});