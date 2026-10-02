import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test", function () {
  it("should detect the block.timestamp vs block.prevrandao mutation in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (set intitalized = true)
    await (await instance.Initialized()).wait();
    
    // Set MinSum to some value, e.g., 1 ether
    await (await instance.SetMinSum(ethers.parseEther("1"))).wait();
    
    // Deploy a Log contract to set as LogFile
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    
    // addr1 deposits 0.5 ether with _lockTime = 0
    const depositAmount = ethers.parseEther("0.5");
    await (await instance.connect(addr1).Put(0, { value: depositAmount })).wait();
    
    // Now addr1 tries to Collect 0.5 ether immediately
    // In original: acc.unlockTime = block.timestamp + 0 = block.timestamp, so block.timestamp > acc.unlockTime is false -> revert
    // In mutant: condition uses block.prevrandao, which may be less than block.timestamp, so acc.unlockTime might not be updated
    // and could remain 0, making block.timestamp > 0 true -> would succeed incorrectly
    // We expect the Collect to revert because unlockTime equals current block.timestamp
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});