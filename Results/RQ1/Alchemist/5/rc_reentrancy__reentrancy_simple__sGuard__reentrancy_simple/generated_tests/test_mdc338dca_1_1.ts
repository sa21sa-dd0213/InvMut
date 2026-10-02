import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mdc338dca test", function () {
  it("should detect the mutant by verifying balance is not zeroed when external call fails", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious receiver contract that reverts on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // Fund the malicious contract with some ether so it has balance to withdraw
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Have the malicious contract add balance to itself in the Reentrance contract
    await malicious.connect(owner).addBalance(instance, { value: ethers.parseEther("1.0") });

    // Get balance before withdrawal attempt
    const balanceBefore = await instance.getBalance(await malicious.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));

    // Attempt withdrawal - this should fail because the malicious contract reverts on receive
    // In the original contract, this would revert entirely, preserving the balance
    // In the mutant, the revert is removed, so balance would be set to 0 despite failed transfer
    const tx = malicious.connect(owner).attack(instance);

    // The transaction should revert in the original (mutant fails to revert)
    await expect(tx).to.be.reverted;

    // Verify balance is still intact (should pass on original, fail on mutant)
    const balanceAfter = await instance.getBalance(await malicious.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("1.0"));
  });
});