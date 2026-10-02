import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m4a2a5368 detection", function () {
  it("should detect mutant by showing Collect fails when lockTime is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set MinSum to 0 and initialize
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();
    
    // addr1 puts 1 ether with _lockTime = 0
    const putAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: putAmount });
    
    // Check unlockTime was set (should be current block.timestamp in original)
    const acc = await instance.Acc(addr1.address);
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    
    // Try to collect immediately - should succeed in original, fail in mutant
    await expect(
      instance.connect(addr1).Collect(putAmount)
    ).to.not.be.reverted;
    
    // Verify balance was deducted (original behavior)
    const accAfter = await instance.Acc(addr1.address);
    expect(accAfter.balance).to.equal(0);
  });
});