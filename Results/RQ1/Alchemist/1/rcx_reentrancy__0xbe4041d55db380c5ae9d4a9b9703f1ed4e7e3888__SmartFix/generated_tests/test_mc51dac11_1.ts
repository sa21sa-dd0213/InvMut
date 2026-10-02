import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - mc51dac11", function () {
  it("should kill mutant by testing Collect with balance > MinSum (mutant uses <= instead of >=)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract
    await (await instance.connect(owner).SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.connect(owner).SetMinSum(ethers.parseEther("1"))).wait();
    await (await instance.connect(owner).Initialized()).wait();
    
    // User puts 2 ETH (balance = 2, MinSum = 1)
    await (await instance.connect(user).Put(0, { value: ethers.parseEther("2") })).wait();
    
    // Wait for unlock (lockTime = 0 means immediately unlockable)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 0.5 ETH - should succeed in original (2 >= 1 && 2 >= 0.5)
    // But should FAIL in mutant (2 <= 1 is false)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});