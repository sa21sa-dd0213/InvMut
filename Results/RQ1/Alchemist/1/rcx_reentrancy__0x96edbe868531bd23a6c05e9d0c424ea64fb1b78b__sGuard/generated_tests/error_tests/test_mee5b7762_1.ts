import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PENNY_BY_PENNY mutant test", function () {
  it("should detect mutant that replaces _s with false in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await (await instance.connect(owner).Initialized()).wait();
    
    // Set minimum sum to 0 for testing
    await (await instance.connect(owner).SetMinSum(0)).wait();
    
    // Deploy LogFile contract (required for Collect to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set LogFile address
    await (await instance.connect(owner).SetLogFile(await logInstance.getAddress())).wait();
    
    // addr1 deposits 1 ether with no lock time
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).Put(0, { value: depositAmount })).wait();
    
    // Get balance before Collect
    const accBefore = await instance.Acc(addr1.address);
    const balanceBefore = accBefore.balance;
    
    // addr1 calls Collect to withdraw the deposited amount
    const tx = await instance.connect(addr1).Collect(depositAmount);
    const receipt = await tx.wait();
    
    // Get balance after Collect
    const accAfter = await instance.Acc(addr1.address);
    const balanceAfter = accAfter.balance;
    
    // In original contract, balance should decrease by depositAmount
    // In mutant, balance remains unchanged because the if(false) prevents the update
    expect(balanceAfter).to.equal(balanceBefore - depositAmount);
    
    // Also verify the LogFile history shows the Collect message
    const historyLength = await logInstance.History.length;
    expect(historyLength).to.be.greaterThan(0);
    
    const lastMessage = await logInstance.History(historyLength - 1n);
    expect(lastMessage.Sender).to.equal(addr1.address);
    expect(lastMessage.Val).to.equal(depositAmount);
    expect(lastMessage.Data).to.equal("Collect");
  });
});