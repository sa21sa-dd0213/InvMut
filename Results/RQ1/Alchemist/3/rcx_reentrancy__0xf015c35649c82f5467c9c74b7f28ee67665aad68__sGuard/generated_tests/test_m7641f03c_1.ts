import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m7641f03c", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Get the initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Send exactly 2 ether to the Put function
    const putAmount = ethers.parseEther("2");
    const tx = await bankInstance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();
    
    // Get the last log entry from History array
    // The Log contract stores messages in History array
    const historyLength = await logInstance.History.length();
    const lastLog = await logInstance.History(historyLength - 1n);
    
    // Assert that the logged value equals the actual msg.value sent (2 ether)
    // The mutant would log msg.value + 1, so this assertion would fail on mutant
    expect(lastLog.Val).to.equal(putAmount);
  });
});