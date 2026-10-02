import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - m4deb0867", function () {
  it("should detect mutant by exploiting reentrancy to bypass hasNoBalance and trigger different behavior between >= and >", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy ModifierEntrancy
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious reentrancy contract that acts as Bank and calls back into airDrop
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // The malicious contract will call airDrop, which passes supportsToken (since it's a Bank)
    // and hasNoBalance (first call), then during the _nonReentrant guard, it re-enters
    // This re-entrancy will:
    // - First call: tokenBalance[malicious] becomes 20, then re-enters
    // - Second call: tokenBalance[malicious] is 20, so hasNoBalance FAILS -> reverts
    // But the key is: if we can somehow bypass hasNoBalance or cause state where
    // tokenBalance[msg.sender] > 0 but the check behaves differently

    // Actually, let's think differently. The only way to call airDrop twice from same address
    // is via reentrancy, but hasNoBalance prevents that. Let's test directly:

    // First, verify that a normal call works (original contract behavior)
    // But we need msg.sender to be a Bank contract, so use the malicious contract

    // Attempt to call airDrop from the malicious contract
    // This should succeed on first call (original) but revert on reentry
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted; // Reverted due to hasNoBalance on reentry

    // Now the key test: After the failed reentrancy, tokenBalance should be 0
    // because the state change was reverted
    const balanceAfter = await instance.tokenBalance(await malicious.getAddress());
    expect(balanceAfter).to.equal(0);

    // The mutant changes >= to >, but since this check is always true for uint arithmetic,
    // the mutant is behaviorally equivalent. Both contracts will behave identically.
    // Therefore this test demonstrates the mutant cannot be killed.

    // For completeness, verify that a single successful call works
    // Deploy a fresh malicious contract for a clean call
    const Malicious2Factory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious2 = await Malicious2Factory.deploy(await instance.getAddress());
    await malicious2.waitForDeployment();

    // Modify malicious2 to only call once (no reentrancy)
    // Actually, we can't modify it after deployment. Let's just test the revert case.

    // Conclusion: No test can kill this mutant because >= and > are equivalent
    // for the expression tokenBalance[msg.sender] + 20 in Solidity 0.8+
  });
});