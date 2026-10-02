import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m09b1d7f4", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Send exactly 1 wei to the Put function via addr1
    const tx = await bankInstance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();
    
    // Get the last message from Log contract's History
    // History is an array, so get the latest entry (index 0)
    const lastMessage = await logInstance.History(0);
    
    // In the original contract, the logged Val should be 1 (the msg.value)
    // In the mutant, the logged Val would be 0 (msg.value - 1)
    // Assert that the logged value equals 1 to kill the mutant
    expect(lastMessage.Val).to.equal(1);
  });
});