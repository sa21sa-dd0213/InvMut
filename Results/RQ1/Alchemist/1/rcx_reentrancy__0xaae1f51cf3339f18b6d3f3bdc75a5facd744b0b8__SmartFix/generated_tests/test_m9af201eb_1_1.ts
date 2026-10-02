import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test for m9af201eb", function () {
  it("should detect division mutant by verifying balance after Collect with non-divisor amount", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DEP_BANK (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(0); // Set MinSum to 0 to allow any withdrawal
    await instance.Initialized();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("100");
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Check initial balance
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);

    // Collect 30 wei (not a divisor of 100)
    const collectAmount = ethers.parseEther("30");
    await instance.connect(addr1).Collect(collectAmount);

    // In original: balance = 100 - 30 = 70
    // In mutant: balance = 100 / 30 = 3 (integer division)
    const expectedOriginalBalance = depositAmount - collectAmount; // 70
    const actualBalance = await instance.balances(addr1.address);

    // The mutant will have balance = 3, which is not equal to 70
    expect(actualBalance).to.equal(expectedOriginalBalance);
  });
});