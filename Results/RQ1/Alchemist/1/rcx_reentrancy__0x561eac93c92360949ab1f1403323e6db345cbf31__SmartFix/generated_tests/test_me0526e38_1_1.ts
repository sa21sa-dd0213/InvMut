import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - Collect balance subtraction", function () {
  it("should revert when Collect causes balance to increase instead of decrease", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy BANK_SAFE (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await Factory.deploy();
    await bank.waitForDeployment();

    // Deploy LogFile contract (required by BANK_SAFE)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the bank
    await bank.SetLogFile(await log.getAddress());
    await bank.SetMinSum(0); // Allow any balance to collect
    await bank.Initialized();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Verify initial balance
    let userBalance = await bank.balances(user.address);
    expect(userBalance).to.equal(depositAmount);

    // User collects 0.5 ether
    const collectAmount = ethers.parseEther("0.5");
    await bank.connect(user).Collect(collectAmount);

    // Check balance after collection
    // On original: balance should decrease to 0.5 ether
    // On mutant: balance would increase to 1.5 ether
    userBalance = await bank.balances(user.address);

    // The mutant would cause balance to be 1.5 ether instead of 0.5 ether
    // This assertion passes on original but fails on mutant
    expect(userBalance).to.equal(ethers.parseEther("0.5"));
  });
});