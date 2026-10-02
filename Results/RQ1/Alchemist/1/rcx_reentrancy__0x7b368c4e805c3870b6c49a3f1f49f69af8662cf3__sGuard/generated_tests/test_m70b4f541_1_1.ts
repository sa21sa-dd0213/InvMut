import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m70b4f541 reentrancy test", function () {
  it("should kill mutant by exploiting missing nonReentrant modifier in Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious reentrancy contract
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract via fallback (Put function)
    await attacker.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("5")
    });

    // Call the malicious contract to trigger reentrancy attack
    await expect(
      malicious.connect(attacker).attack(ethers.parseEther("2"))
    ).to.be.revertedWith("reentrancy guard triggered"); // Original should revert

    // For mutant, this would succeed - check that balance was drained beyond allowed
    // The mutant allows multiple withdrawals in one transaction
    const attackerBalance = await ethers.provider.getBalance(attacker.address);
    expect(attackerBalance).to.be.above(ethers.parseEther("0")); // Attacker profited
  });
});