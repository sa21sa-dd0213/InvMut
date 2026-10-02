import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m7641f03c", function () {
  it("should detect msg.value+1 bug in Put function logging", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    const logAddress = await logContract.getAddress();
    
    // Get the Log contract instance connected to the deployed address
    const log = await ethers.getContractAt("Log", logAddress);
    
    // Send exactly 1 ether to Put function
    const sendAmount = ethers.parseEther("1.0");
    const tx = await bank.connect(user).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Check the last message in History - the Val should equal sendAmount (not sendAmount+1)
    const historyLength = await log.History.length;
    const lastMessage = await log.History(historyLength - 1n);
    
    // In original: msg.value logged correctly
    // In mutant: msg.value+1 logged, so this assertion will fail
    expect(lastMessage.Val).to.equal(sendAmount);
  });
});