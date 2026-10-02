import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - reentrancy guard removal", function () {
  it("should detect missing reentrancy guard by performing a reentrancy attack", async function () {
    // Deploy the contract (no constructor arguments needed for keepMyEther)
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(instance.target);
    await malicious.waitForDeployment();

    // Fund the malicious contract with ETH via fallback
    const fundTx = await owner.sendTransaction({
      to: malicious.target,
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attacker sends ETH to the keepMyEther contract to get a balance
    const depositTx = await attacker.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("1.0")
    });
    await depositTx.wait();

    // Attacker triggers withdrawal from malicious contract (which calls withdraw again in fallback)
    const attackTx = await malicious.connect(attacker).attack({ value: ethers.parseEther("1.0") });

    // In the original contract with reentrancy guard, this should revert
    // In the mutant without guard, it would succeed and drain more than balance
    await expect(attackTx).to.be.reverted;
  });
});