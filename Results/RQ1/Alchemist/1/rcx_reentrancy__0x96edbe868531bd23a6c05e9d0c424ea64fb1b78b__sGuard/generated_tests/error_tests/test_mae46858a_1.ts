import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mae46858a test", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();
    
    // Set MinSum to 0 and initialize
    await penny.connect(owner).SetMinSum(0);
    await penny.connect(owner).SetLogFile(await logFile.getAddress());
    await penny.connect(owner).Initialized();
    
    // User sends exactly 1 wei to Put
    const tx = await penny.connect(user).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();
    
    // Get the logged message from LogFile history (index 0)
    const [sender, data, val, time] = await logFile.History(0);
    
    // The mutant logs msg.value+1 (i.e., 1 ether + 1 wei), but original logs exactly 1 ether
    expect(val).to.equal(ethers.parseEther("1"));
  });
});