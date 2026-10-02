import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mdc338dca test", function () {
  it("should revert and keep balance when withdrawal to rejecting contract fails", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a test contract that will revert on receive
    const TestContractFactory = await ethers.getContractFactory("TestWithdrawReverter");
    const testContract = await TestContractFactory.deploy(instanceAddress);
    await testContract.waitForDeployment();

    // Fund the test contract's balance in Reentrance by having it call addToBalance
    const fundingAmount = ethers.parseEther("0.5");
    await testContract.deposit({ value: fundingAmount });

    // Verify balance was recorded
    const balanceBefore = await instance.getBalance(await testContract.getAddress());
    expect(balanceBefore).to.equal(fundingAmount);

    // Call withdrawBalance - this should revert in original, but in mutant it will zero the balance
    await testContract.triggerWithdraw();

    // Check balance after withdrawal attempt
    const balanceAfter = await instance.getBalance(await testContract.getAddress());

    // The test kills the mutant if balanceAfter is 0 (mutant zeros it) vs original keeps it
    // We expect the original behavior: balance should remain non-zero
    expect(balanceAfter).to.equal(fundingAmount);
  });
});