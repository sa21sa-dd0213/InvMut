import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - ma1365842", function () {
  it("should detect mutant by failing to collect when balance > _am", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();
    
    // Set up the contract
    await penny.connect(owner).SetLogFile(await logFile.getAddress());
    await penny.connect(owner).SetMinSum(ethers.parseEther("1"));
    await penny.connect(owner).Initialized();
    
    // addr1 puts 10 ETH with lock time of 1 second
    await penny.connect(addr1).Put(1, { value: ethers.parseEther("10") });
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // addr1 tries to collect 5 ETH (balance=10, _am=5, balance > _am)
    // Original would succeed, mutant should fail because 10 <= 5 is false
    await expect(
      penny.connect(addr1).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});