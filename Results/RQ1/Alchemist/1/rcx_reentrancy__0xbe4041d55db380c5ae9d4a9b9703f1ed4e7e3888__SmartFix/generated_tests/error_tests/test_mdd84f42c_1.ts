import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant test", function () {
  it("should detect mutant that replaces _s with false in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Log contract to use as LogFile
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Setup: set MinSum to 0, set LogFile, and initialize the contract
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit 1 ether from addr1 with lock time of 1 second
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(1, { value: depositAmount });
    
    // Wait for lock time to expire
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Attempt to collect the deposited amount
    const tx = await instance.connect(addr1).Collect(depositAmount);
    const receipt = await tx.wait();
    
    // Check that the transaction succeeded (not reverted)
    expect(receipt.status).to.equal(1);
    
    // Check that addr1 received the ether (balance increased by deposit amount minus gas)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance - initialBalance).to.equal(depositAmount);
    
    // Verify contract balance decreased accordingly
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});