import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - mf01610e8", function () {
  it("should detect mutant by comparing logged value with actual msg.value for 1 wei deposit", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Send exactly 1 wei to Put function
    const tx = await bank.connect(depositor).Put(0, { value: 1 });
    await tx.wait();
    
    // Check the logged value in History array
    const historyEntry = await log.History(0);
    const loggedValue = historyEntry.Val;
    
    // Original should log 1, mutant logs 0 (msg.value - 1)
    expect(loggedValue).to.equal(1);
  });
});