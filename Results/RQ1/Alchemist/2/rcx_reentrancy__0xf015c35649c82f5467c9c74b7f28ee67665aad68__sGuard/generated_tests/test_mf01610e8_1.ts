import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - mf01610e8", function () {
  it("should detect incorrect logged value in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get the Log contract instance to check history
    const LogInstance = await ethers.getContractAt("Log", await log.getAddress());
    
    // Send exactly 2 ether to Put function via addr1
    const depositAmount = ethers.parseEther("2");
    const tx = await bank.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Check the logged value in the last message of History array
    const historyLength = await LogInstance.History.length;
    const lastMessage = await LogInstance.History(historyLength - 1n);
    
    // Original would record msg.value (2 ether), mutant records msg.value - 1 (2 ether - 1 wei)
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});