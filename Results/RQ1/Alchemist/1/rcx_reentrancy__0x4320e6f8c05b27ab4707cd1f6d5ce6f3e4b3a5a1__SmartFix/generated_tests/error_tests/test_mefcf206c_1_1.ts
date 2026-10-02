import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant test for mefcf206c", function () {
  it("should kill the mutant by succeeding on Collect when condition is met", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (no constructor arguments needed)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy ACCURAL_DEPOSIT with LogFile address as constructor argument
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy(await logFile.getAddress());
    await instance.waitForDeployment();

    // Set MinSum to 1 ether (default) - no need to call SetMinSum

    // Initialize the contract (call Initialized to allow operations)
    await instance.connect(owner).Initialized();

    // Deposit exactly 2 ether from addr1 (more than MinSum of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check balance is correct
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);

    // Now call Collect with 1 ether (valid: balance >= MinSum and balance >= _am)
    const collectAmount = ethers.parseEther("1");

    // On original: succeeds, on mutant: reverts due to false condition
    // We expect it to succeed, so mutant will fail (revert) killing it
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify balance decreased correctly
    expect(await instance.balances(addr1.address)).to.equal(
      depositAmount - collectAmount
    );
  });
});