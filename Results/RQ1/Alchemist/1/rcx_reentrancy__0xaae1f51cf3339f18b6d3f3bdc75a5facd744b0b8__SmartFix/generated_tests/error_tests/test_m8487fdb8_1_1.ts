import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant detection - Collect function", function () {
  it("should detect mutant that adds instead of subtracts in Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (required by DEP_BANK constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy DEP_BANK with LogFile address as constructor argument
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const bank = await Factory.deploy(await logFile.getAddress());
    await bank.waitForDeployment();

    // Initialize the contract
    await bank.Initialized();

    // Set minimum sum to 0 for easy testing
    await bank.SetMinSum(0);

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Check initial balance
    expect(await bank.balances(user.address)).to.equal(depositAmount);

    // User collects 0.5 ether
    const collectAmount = ethers.parseEther("0.5");
    await bank.connect(user).Collect(collectAmount);

    // In the original contract, balance should be 0.5 ether (1.0 - 0.5)
    // In the mutant, balance would be 1.5 ether (1.0 + 0.5)
    const expectedBalance = depositAmount - collectAmount;
    const actualBalance = await bank.balances(user.address);

    // This assertion will pass on original but fail on mutant
    expect(actualBalance).to.equal(expectedBalance);
  });
});