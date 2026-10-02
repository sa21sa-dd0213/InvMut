import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mf01610e8 test", function () {
  it("should detect that logged value is msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Send exactly 1 ether to Put function
    const depositAmount = ethers.parseEther("1");
    const tx = await bank.connect(user).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Get the last message from Log's History array
    const historyLength = await log.History.length;
    const lastMessage = await log.History(historyLength - 1n);
    
    // Assert that logged value equals the actual amount sent
    // Mutant would log msg.value-1, so this assertion fails on mutant
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});