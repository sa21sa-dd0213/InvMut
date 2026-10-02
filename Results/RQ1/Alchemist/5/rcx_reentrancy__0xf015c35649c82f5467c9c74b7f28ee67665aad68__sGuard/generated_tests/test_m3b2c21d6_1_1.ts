import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m3b2c21d6 - reentrancy guard removed from Put", function () {
  it("should revert on reentrant call to Put with nonReentrant modifier in original, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(await bank.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract with some ETH to make the initial Put call
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("10")
    });

    // The malicious contract will call Put(0) in its fallback, which should revert
    // with nonReentrant but succeed without it
    // We expect this to revert in the original (with modifier), but succeed in mutant
    // Since we're testing the mutant, we expect it to NOT revert
    const tx = malicious.connect(attacker).attack({ value: ethers.parseEther("1") });

    // The test should detect the mutant: if the call succeeds (no revert), 
    // it means the reentrancy guard is missing - mutant detected
    await expect(tx).to.not.be.reverted;

    // Additionally verify that the balance was manipulated (reentrant call succeeded)
    const maliciousBalance = await ethers.provider.getBalance(await malicious.getAddress());
    // The initial balance was 10 ETH, we sent 1 ETH in attack() but the reentrant Put
    // in fallback should have also added value, so balance should be > 10
    expect(maliciousBalance).to.be.gt(ethers.parseEther("10"));
  });
});