import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mfaf663d1 test", function () {
  it("should kill mutant by attempting to collect exactly the balance when balance equals amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set MinSum, set LogFile, initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // addr1 deposits exactly 1 ether (MinSum)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    
    // Fast forward time to pass unlockTime (block.timestamp is now after deposit)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect exactly 1 ether (balance == _am)
    // Original contract allows this; mutant with > should revert
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});