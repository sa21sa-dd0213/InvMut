import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mf01610e8 test", function () {
  it("should detect that logged value is one wei less than actual msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Send 2 ether to Put function via addr1
    const depositAmount = ethers.parseEther("2");
    const tx = await bankInstance.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Get the last logged message from Log contract
    const historyCount = await logInstance.History.length;
    const lastMessage = await logInstance.History(historyCount - 1n);
    
    // The logged Val should be exactly the msg.value sent (2 ether)
    // In the mutant, it will be 2 ether - 1 wei
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});