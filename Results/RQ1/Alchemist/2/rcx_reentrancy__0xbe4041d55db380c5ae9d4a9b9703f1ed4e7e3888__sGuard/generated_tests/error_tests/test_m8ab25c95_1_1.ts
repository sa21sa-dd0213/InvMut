import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m8ab25c95 - reentrancy guard removed from Put", function () {
  it("should detect missing nonReentrant_ modifier on Put via reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy Log contract (no constructor arguments)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the contract and set up LogFile
    await (await moneyBox.SetLogFile(await log.getAddress())).wait();
    await (await moneyBox.Initialized()).wait();

    // Deploy attacker contract that will attempt reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await moneyBox.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with ETH
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Set MinSum to a small value so collect is possible
    await (await moneyBox.SetMinSum(1)).wait();

    // Attempt reentrancy: attacker contract calls Put, which triggers fallback -> Put again
    // In original contract this would revert due to nonReentrant_, in mutant it succeeds
    const tx = attackerContract.attack({ value: ethers.parseEther("1.0") });

    // The test should fail on the mutant because the attack succeeds (balance inflated)
    // On original it reverts, so we expect revert
    await expect(tx).to.be.reverted;

    // Verify balance integrity - if attack succeeded, balance would be > 1 ETH
    const attackerBalance = (await moneyBox.Acc(await attackerContract.getAddress())).balance;
    expect(attackerBalance).to.equal(ethers.parseEther("1.0"));
  });
});