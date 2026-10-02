import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mb654cc1c - reentrancy guard removed from Put", function () {
  it("should detect removal of nonReentrant modifier on Put by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    const walletAddress = await wallet.getAddress();

    // Deploy a malicious reentrancy contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(walletAddress);
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with some ether for the initial Put call
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });

    // Set a low unlock time so Collect can be called
    await attackerContract.connect(attacker).setUnlockTime(1);

    // Perform the attack: this should succeed on the mutant (reentrancy possible)
    // but would revert on the original due to nonReentrant modifier
    const tx = await attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") });

    // On the mutant, the attack should succeed and drain funds
    // On the original, this would revert
    // We expect the attack to succeed (mutant is vulnerable)
    await expect(tx).to.not.be.reverted;

    // Verify that the attacker was able to call Put recursively via fallback
    // Check that the balance of the attacker contract is > 0 (funds were drained)
    const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("1"));
  });
});