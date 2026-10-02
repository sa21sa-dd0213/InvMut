import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m74b73f34 test", function () {
  it("should kill mutant by depositing more than MinSum and trying to collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy BANK_SAFE (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).Initialized();
    
    // User deposits 15 ETH (greater than MinSum of 10)
    await instance.connect(user).Deposit({ value: ethers.parseEther("15") });
    
    // User tries to collect 5 ETH - should succeed on original but fail on mutant
    // because mutant requires balance == MinSum (10), not >= MinSum
    await expect(
      instance.connect(user).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});