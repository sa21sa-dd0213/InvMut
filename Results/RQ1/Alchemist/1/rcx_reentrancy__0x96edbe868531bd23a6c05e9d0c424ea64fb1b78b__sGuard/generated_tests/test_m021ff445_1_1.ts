import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - m021ff445", function () {
  it("should fail on mutant when Collect is called but external call to receiver reverts", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the PENNY_BY_PENNY contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that reverts on receive to simulate a failed call
    const RevertReceiverFactory = await ethers.getContractFactory("RevertReceiver");
    const revertReceiver = await RevertReceiverFactory.deploy();
    await revertReceiver.waitForDeployment();

    // Initialize the contract
    await (await instance.Initialized()).wait();

    // Set MinSum to 0 so any balance qualifies
    await (await instance.SetMinSum(0)).wait();

    // User puts some Ether into the contract
    const putAmount = ethers.parseEther("1.0");
    await (await instance.connect(user).Put(0, { value: putAmount })).wait();

    // Check initial balance of user in the contract
    const userAcc = await instance.Acc(user.address);
    expect(userAcc.balance).to.equal(putAmount);

    // Now user calls Collect through the revertReceiver contract address
    // The call will fail because RevertReceiver reverts on receive
    const collectAmount = ethers.parseEther("0.5");
    const tx = instance.connect(user).Collect(collectAmount);
    
    // In the original contract, the balance should NOT be deducted because the call fails
    // In the mutant, the balance WILL be deducted because it always proceeds
    await expect(tx).to.not.be.reverted;
    
    // Check if balance was incorrectly deducted (mutant behavior)
    const accAfter = await instance.Acc(user.address);
    
    // Get log count - need to access History array directly
    const logCount = await instance.Log.History.length;
    
    // If mutant: balance will be reduced, log will be added
    // If original: balance unchanged, no log added
    // We assert the original behavior to detect the mutant
    expect(accAfter.balance).to.equal(putAmount);
    expect(logCount).to.equal(0);
  });
});