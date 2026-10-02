import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection - SetMinSum nonReentrant removal", function () {
  it("should revert on reentrant call to SetMinSum in original, but succeed in mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious contract that will re-enter SetMinSum
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const malicious = await MaliciousFactory.deploy(await instance.getAddress());
    await malicious.waitForDeployment();

    // First, initialize the contract (this must be done before SetMinSum can be called again)
    await (await instance.connect(owner).Initialized()).wait();

    // Attempt reentrant attack via malicious contract
    // The malicious contract will call SetMinSum, then in its fallback call SetMinSum again
    await expect(
      malicious.connect(attacker).attack()
    ).to.be.reverted; // Original would revert due to nonReentrant; mutant might not
  });
});