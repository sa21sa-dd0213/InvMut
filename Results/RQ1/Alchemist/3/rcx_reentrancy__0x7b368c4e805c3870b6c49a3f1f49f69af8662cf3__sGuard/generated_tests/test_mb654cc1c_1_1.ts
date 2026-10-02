import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - mb654cc1c", function () {
  it("should revert on reentrant call to Put when nonReentrant_ modifier is present", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious reentrancy contract
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const malicious = await MaliciousFactory.deploy(await wallet.getAddress());
    await malicious.waitForDeployment();

    // Fund the malicious contract with initial ETH
    await attacker.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });

    // Attack: calling attack() will trigger Put() via fallback reentrancy
    // In original contract with nonReentrant_, this should revert
    // In mutant without modifier, it would succeed (kill the mutant)
    await expect(
      malicious.connect(attacker).attack({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});