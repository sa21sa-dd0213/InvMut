import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - mf7687291", function () {
  it("should allow zero-value deposit in original but fail in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MONEY_BOX
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract: initialize LogFile and MinSum, then initialize
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();
    
    // Attempt to call Put with 0 value
    // The original allows this (balance + 0 >= balance is true)
    // The mutant rejects this (balance + 0 > balance is false)
    await expect(
      instance.connect(addr1).Put(100, { value: 0 })
    ).to.be.reverted;
  });
});