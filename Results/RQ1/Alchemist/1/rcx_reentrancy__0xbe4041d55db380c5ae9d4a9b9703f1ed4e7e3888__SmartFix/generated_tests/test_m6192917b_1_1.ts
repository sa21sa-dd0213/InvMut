import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test for m6192917b", function () {
  it("should detect the mutant that changed > to < in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so we don't need a minimum balance to collect
    await (await instance.SetMinSum(0)).wait();
    
    // Set a dummy LogFile address (any address works since we won't check logs)
    await (await instance.SetLogFile(ethers.ZeroAddress)).wait();
    
    // Initialize the contract
    await (await instance.Initialized()).wait();

    // Put 1 ether with a lock time of 1 second
    const putAmount = ethers.parseEther("1");
    const lockTime = 1;
    await (await instance.connect(addr1).Put(lockTime, { value: putAmount })).wait();

    // Wait until after the lock time has passed
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect the full amount
    // Original: should succeed (block.timestamp > acc.unlockTime)
    // Mutant: should revert (block.timestamp < acc.unlockTime is false since we're after unlock time)
    const collectAmount = ethers.parseEther("1");
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify the balance was reduced after successful collection
    const acc = await instance.Acc(addr1.address);
    expect(acc.balance).to.equal(0);
  });
});