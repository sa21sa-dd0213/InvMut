import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mc853a685 - revert removal test", function () {
  it("should kill the mutant by verifying balance is preserved when external call fails", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a malicious contract that will reject ether
    const MaliciousFactory = await ethers.getContractFactory("MaliciousRejecter");
    const malicious = await MaliciousFactory.deploy(instanceAddress);
    await malicious.waitForDeployment();

    // Fund the malicious contract in the Reentrance contract
    const fundAmount = ethers.parseEther("1.0");

    // Add balance to the malicious contract via the Reentrance contract
    await instance.connect(owner).addToBalance({ value: fundAmount });

    // Transfer ownership of balance to malicious contract by having owner send to malicious
    // Actually, let's directly add balance to the malicious contract's address in Reentrance
    // We'll use the addToBalance function from the malicious contract
    await malicious.deposit({ value: fundAmount });

    // Verify initial balance
    const initialBalance = await instance.getBalance(await malicious.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Attempt withdrawal - this should revert in original but NOT in mutant
    // In the mutant, the revert is removed, so the balance will be set to 0 even though the call fails
    await malicious.attemptWithdraw();

    // Check the balance in Reentrance for the malicious contract
    const balanceAfter = await instance.getBalance(await malicious.getAddress());

    // In the original contract, this would have reverted and balance would be preserved
    // In the mutant, the balance will be 0 (set to 0 before the failed call, and no revert to undo it)
    // So we expect balanceAfter to be 0 in the mutant (killing it)
    expect(balanceAfter).to.equal(0);
  });
});