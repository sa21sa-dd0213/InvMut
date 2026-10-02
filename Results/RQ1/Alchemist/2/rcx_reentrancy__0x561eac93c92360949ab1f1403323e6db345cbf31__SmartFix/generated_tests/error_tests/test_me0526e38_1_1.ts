import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - me0526e38", function () {
  it("should detect mutant that uses addition instead of subtraction in Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.Initialized();

    // Set MinSum to a small value so addr1 can collect
    await instance.SetMinSum(100);

    // Deploy a LogFile contract (required for Deposit to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set the log file address
    await instance.SetLogFile(await logInstance.getAddress());

    // Deposit exactly 1000 wei from addr1
    const depositAmount = ethers.parseEther("0.001"); // 1000 wei equivalent
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Check balance before Collect
    const balanceBefore = await instance.balances(addr1.address);
    expect(balanceBefore).to.equal(depositAmount);

    // Collect 500 wei (half of the deposit)
    const collectAmount = ethers.parseEther("0.0005"); // 500 wei
    await instance.connect(addr1).Collect(collectAmount);

    // Check balance after Collect
    const balanceAfter = await instance.balances(addr1.address);

    // In the original contract, balance should decrease by collectAmount
    // In the mutant (addition), balance would increase, making this assertion fail
    expect(balanceAfter).to.equal(depositAmount - collectAmount);
  });
});