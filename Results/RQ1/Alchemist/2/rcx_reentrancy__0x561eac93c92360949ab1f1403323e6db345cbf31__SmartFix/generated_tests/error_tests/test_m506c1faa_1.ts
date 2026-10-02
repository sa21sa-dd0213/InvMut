import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - division instead of subtraction", function () {
  it("should detect mutant where Collect uses / instead of -", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to allow collection
    await instance.SetMinSum(10);
    await instance.Initialized();

    // Deploy LogFile
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Set LogFile address
    await instance.SetLogFile(await logFile.getAddress());

    // Deposit 100 wei
    await instance.connect(addr1).Deposit({ value: 100 });

    // Check balance before collection
    expect(await instance.balances(addr1.address)).to.equal(100);

    // Collect 3 wei (does not evenly divide 100)
    await instance.connect(addr1).Collect(3);

    // Original: balance should be 100 - 3 = 97
    // Mutant: balance would be 100 / 3 = 33 (integer division)
    const balanceAfter = await instance.balances(addr1.address);
    expect(balanceAfter).to.equal(97); // This will pass on original, fail on mutant
  });
});