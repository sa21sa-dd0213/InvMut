import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - msg.value vs msg.value-1", function () {
  it("should kill mutant by sending exactly 1 wei and checking owner balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Send exactly 1 wei to the go() function
    const tx = await instance.connect(attacker).go({ value: 1 });
    await tx.wait();

    // Get final balance of owner
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

    // Check that the contract balance is zero after the call
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceAfter).to.equal(0);

    // Real detection: The mutant sends msg.value-1, so if we send 0 wei, it will attempt
    // to send -1 wei which underflows (reverts) in Solidity 0.8+.
    // Original: send 0 wei to target (valid). Mutant: msg.value-1 = -1 => revert.
    const tx2 = instance.connect(attacker).go({ value: 0 });
    await expect(tx2).to.be.reverted; // Mutant reverts, original does not
  });
});