import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test", function () {
  it("should kill mutant mf4addeec (|| instead of &&) by withdrawing amount > balance but >= MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether (default is already 1 ether)
    // Initialize the contract so SetMinSum cannot be called again
    await (await instance.Initialized()).wait();

    // Deposit exactly 1 ether (meets MinSum)
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(addr1).Deposit({ value: depositAmount })).wait();

    // Now addr1 has balance = 1 ether, MinSum = 1 ether
    // Try to collect 2 ether (balance < _am, but balance >= MinSum)
    // Original: requires balance >= MinSum AND balance >= _am -> fails (reverts)
    // Mutant: requires balance >= MinSum OR balance >= _am -> passes (first condition true)
    const collectAmount = ethers.parseEther("2");
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted; // Expect revert on original, but mutant will NOT revert => test fails on mutant => kills it
  });
});