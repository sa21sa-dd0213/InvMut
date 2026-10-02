import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection test", function () {
  it("should detect mutant m31bd0739 by triggering a failed external call and checking balance is not zeroed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deploy a malicious contract that will reject any incoming ETH
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();

    // First add balance for the malicious contract
    await instance.connect(malicious).addToBalance({ value: ethers.parseEther("0.5") });

    // Get balance before withdrawal
    const balanceBefore = await instance.getBalance(await malicious.getAddress());

    // Attempt withdrawal - in original contract this reverts, in mutant it proceeds incorrectly
    await expect(
      instance.connect(malicious).withdrawBalance()
    ).to.be.reverted;

    // Verify balance was NOT set to zero (mutant would incorrectly zero it)
    const balanceAfter = await instance.getBalance(await malicious.getAddress());
    expect(balanceAfter).to.equal(balanceBefore);
  });
});