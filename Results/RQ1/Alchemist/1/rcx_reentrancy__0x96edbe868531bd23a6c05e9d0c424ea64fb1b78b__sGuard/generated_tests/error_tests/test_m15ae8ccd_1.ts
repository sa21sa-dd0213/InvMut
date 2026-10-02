import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m15ae8ccd test", function () {
  it("should detect mutant that changes >= to == in Collect condition", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Set MinSum and LogFile, then initialize
    await instance.connect(owner).SetMinSum(100);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // User deposits 200 wei (more than MinSum of 100)
    await instance.connect(user).Put(0, { value: 200 });
    
    // Verify balance is 200
    const userAcc = await instance.Acc(user.address);
    expect(userAcc.balance).to.equal(200);
    
    // Try to collect 50 wei (should succeed on original, fail on mutant)
    // On original: 200 >= 100 && 200 >= 50 is true
    // On mutant: 200 == 100 && 200 >= 50 is false
    await expect(
      instance.connect(user).Collect(50)
    ).to.be.reverted;
    
    // Additional check: balance should remain unchanged (200 wei)
    const userAccAfter = await instance.Acc(user.address);
    expect(userAccAfter.balance).to.equal(200);
  });
});