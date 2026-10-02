import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mb2beedaa test", function () {
  it("should kill the mutant by expecting a successful Collect that fails on mutant due to false condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so any balance meets the minimum
    await instance.SetMinSum(0);

    // Initialize the contract
    await instance.Initialized();

    // Deposit 1 ether with a short lock time (1 second)
    const depositAmount = ethers.parseEther("1");
    const lockTime = 1;
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });

    // Advance time past unlock time
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // Record balance before Collect
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Attempt to collect 0.5 ether (valid amount)
    const collectAmount = ethers.parseEther("0.5");
    const tx = await instance.connect(addr1).Collect(collectAmount);
    const receipt = await tx.wait();

    // Check that the transaction succeeded (original contract would transfer)
    expect(receipt?.status).to.equal(1);

    // Check that balance decreased (mutant would not transfer, balance stays same)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});