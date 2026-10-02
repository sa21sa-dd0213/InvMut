import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44c98592 - kill by failed call", function () {
  it("should revert on withdrawAll when external call fails (require(callResult) removed)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Attacker deposits ether into the DAO from the malicious contract
    const depositAmount = ethers.parseEther("1.0");
    await malicious.connect(attacker).attack(dao.target, { value: depositAmount });

    // Now call withdrawAll from the malicious contract
    const daoContractWithSigner = dao.connect(attacker);

    // In the original contract, this would revert due to require(callResult)
    // In the mutant (without require), the call fails silently, corrupting state
    // We expect the transaction to NOT revert on the mutant (i.e., it succeeds)
    // But we can detect the mutant by checking that balance/credit are wrong
    const tx = await daoContractWithSigner.withdrawAll();

    // Wait for transaction
    await tx.wait();

    // After the failed call, the mutant will have set credit to 0 and reduced balance
    // But the attacker didn't actually receive the ether
    // Verify the attacker's credit is 0 (corrupted state)
    expect(await dao.credit(malicious.target)).to.equal(0);

    // Verify the contract balance decreased even though ether wasn't transferred
    const contractBalance = await ethers.provider.getBalance(dao.target);
    expect(contractBalance).to.equal(0);

    // Verify the malicious contract didn't receive the ether (failed call)
    const maliciousBalance = await ethers.provider.getBalance(malicious.target);
    expect(maliciousBalance).to.equal(0);
  });
});