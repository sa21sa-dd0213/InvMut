import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther - mutant m44260581 (reentrancy guard removed)", function () {
  it("should fail due to reentrancy attack when guard is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious contract for reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(instance.target);
    await malicious.waitForDeployment();

    // Fund the malicious contract with 1 ETH
    await owner.sendTransaction({
      to: malicious.target,
      value: ethers.parseEther("1.0")
    });

    // Initial balance check
    const initialBalance = await ethers.provider.getBalance(malicious.target);
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Trigger the reentrancy attack
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted;

    // Verify the contract still has funds (guard prevented full drain)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(ethers.parseEther("0.5")); // Only half drained due to guard
  });
});