import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m86da142c test", function () {
  it("should detect mutant where _veri_ok is replaced with false by expecting a successful Collect call to complete", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK (no constructor arguments)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set MinSum to 0 so that any balance qualifies
    await instance.SetMinSum(0);
    
    // Set LogFile address
    await instance.SetLogFile(await logFile.getAddress());
    
    // Initialize the contract
    await instance.Initialized();
    
    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify balance
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);
    
    // Now call Collect with 0.5 ether - this should succeed on original but revert on mutant
    const collectAmount = ethers.parseEther("0.5");
    
    // On original contract, this call should succeed
    // On mutant, the hardcoded false will cause revert
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;
    
    // Verify the balance decreased
    expect(await instance.balances(addr1.address)).to.equal(depositAmount - collectAmount);
  });
});