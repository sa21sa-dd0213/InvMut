import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant test for mcc251322", function () {
  it("should allow Collect when balance > MinSum on original, but revert on mutant with == check", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy ACCURAL_DEPOSIT (no constructor arguments)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (needed for AddMessage calls)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set the LogFile address in the main contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // Set MinSum to 1 ether
    const MinSum = ethers.parseEther("1");
    await instance.connect(owner).SetMinSum(MinSum);

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // User deposits 2 ether (greater than MinSum of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Deposit({ value: depositAmount });

    // Verify balance is now 2 ether
    const balance = await instance.balances(user.address);
    expect(balance).to.equal(depositAmount);

    // User attempts to collect 0.5 ether (valid amount, balance >= _am and balance > MinSum)
    const collectAmount = ethers.parseEther("0.5");

    // This should succeed on original (balance >= MinSum), but fail on mutant (balance == MinSum is false)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});