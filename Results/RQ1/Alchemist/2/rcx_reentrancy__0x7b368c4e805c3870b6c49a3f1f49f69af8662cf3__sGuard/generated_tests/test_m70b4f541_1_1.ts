import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m70b4f541 test", function () {
  it("should detect missing nonReentrant modifier by exploiting reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerInstance = await AttackerFactory.deploy(await walletInstance.getAddress());
    await attackerInstance.waitForDeployment();

    // Fund the attacker contract with initial deposit
    await attackerInstance.connect(attacker).deposit({ value: ethers.parseEther("2") });

    // Wait for unlock time to pass (set unlock time to current timestamp)
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    await network.provider.send("evm_setNextBlockTimestamp", [currentTime + 100]);
    await network.provider.send("evm_mine");

    // Attack: call the malicious contract to start reentrancy
    // The attacker contract will call Collect, and in its receive() will call Collect again
    // Original contract should revert the second call due to nonReentrant modifier
    // Mutant contract should allow the second call and drain funds
    const attackTx = attackerInstance.connect(attacker).attack({ value: ethers.parseEther("1") });

    // For the mutant, this attack will succeed (no revert expected)
    // We expect the test to fail on the mutant because the attack should be prevented
    // We check that the attacker contract balance increased (successful reentrancy)
    await expect(attackTx).to.not.be.reverted;

    // Verify the attacker stole more than deposited (successful reentrancy)
    const attackerBalance = await ethers.provider.getBalance(await attackerInstance.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("2"));
  });
});