import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test", function () {
  it("should kill mutant mef6fb84c by verifying balance deduction and ether transfer after Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await (await instance.Initialized()).wait();

    // Set minimum sum to 0 to allow any withdrawal
    await (await instance.SetMinSum(0)).wait();

    // Deploy a Log contract (needed for MONEY_BOX to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();

    // addr1 deposits 1 ether with lock time 0
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).Put(0, { value: depositAmount })).wait();

    // Record addr1's balance before Collect
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call Collect with the full deposit amount
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Collect(collectAmount);
    const receipt = await tx.wait();

    // Check that addr1's balance increased by approximately 1 ether (minus gas)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    const balanceDiff = balanceAfter - balanceBefore;
    expect(balanceDiff).to.be.closeTo(collectAmount, ethers.parseEther("0.01"));

    // Check that the contract balance decreased
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);

    // Check that addr1's account balance in the contract is now 0
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(0);
  });
});