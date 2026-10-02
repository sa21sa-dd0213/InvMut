import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection - m8144e2c5", function () {
  it("should detect the mutant that adds 1 extra wei to balance on Put", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Log contract (needed for Put to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set the Log file address and initialize
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();
    
    // Send exactly 100 wei to Put
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(user).Put(0, { value: depositAmount });
    
    // Check balance in contract - should be 100 wei originally, but mutant will have 101 wei
    const holder = await instance.Acc(user.address);
    const expectedBalance = depositAmount; // 100 wei
    
    // Try to collect exactly the deposit amount
    await instance.connect(user).Collect(depositAmount);
    
    // After collection, balance should be exactly 0 in original
    const finalHolder = await instance.Acc(user.address);
    
    // In the original, this will be 0; in the mutant, balance will be 1 wei remaining
    expect(finalHolder.balance).to.equal(0);
  });
});