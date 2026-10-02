import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mcf19a7a1 test", function () {
  it("should detect division mutant in Collect function by checking balance after withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set minimum sum to 0 so Collect can be called
    await instance.connect(owner).SetMinSum(0);
    
    // Deploy LogFile for logging
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // addr1 deposits 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Check initial balance
    let holderInfo = await instance.connect(addr1).Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Collect 10 wei
    const collectAmount = ethers.parseEther("0.00000000000000001"); // 10 wei
    await instance.connect(addr1).Collect(collectAmount);
    
    // Check remaining balance - original uses subtraction (90 wei), mutant uses division (10 wei)
    holderInfo = await instance.connect(addr1).Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount - collectAmount);
  });
});