import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m32dfd3f7 test", function () {
  it("should detect that mutant logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first since PENNY_BY_PENNY needs it
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set LogFile address and initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Send exactly 1 wei via Put
    const tx = await instance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();
    
    // Query the LogFile history - last message should have Val = 1
    const history = await logFile.History(0);
    const loggedValue = history.Val;
    
    // Original would log 1, mutant logs 0, so this assertion kills the mutant
    expect(loggedValue).to.equal(1);
  });
});