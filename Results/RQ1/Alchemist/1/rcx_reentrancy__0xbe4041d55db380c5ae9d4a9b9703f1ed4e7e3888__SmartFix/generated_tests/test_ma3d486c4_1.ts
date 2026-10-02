import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - ma3d486c4", function () {
  it("should detect balance addition bug in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (required for LogFile)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();
    
    // User deposits 1 ETH with 1 hour lock time
    const depositAmount = ethers.parseEther("1");
    const tx1 = await instance.connect(user).Put(3600, { value: depositAmount });
    await tx1.wait();
    
    // Get initial balance
    const holderBefore = await instance.Acc(user.address);
    const balanceBefore = holderBefore.balance;
    
    // Collect 0.5 ETH after lock time expires
    const collectAmount = ethers.parseEther("0.5");
    
    // Fast-forward time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    
    const tx2 = await instance.connect(user).Collect(collectAmount);
    await tx2.wait();
    
    // Check the balance after collection
    const holderAfter = await instance.Acc(user.address);
    const balanceAfter = holderAfter.balance;
    
    // In the original contract: balanceAfter should be balanceBefore - collectAmount
    // In the mutant: balanceAfter will be balanceBefore + collectAmount (incorrect)
    // This assertion will fail on the mutant, killing it
    expect(balanceAfter).to.equal(balanceBefore - collectAmount);
  });
});