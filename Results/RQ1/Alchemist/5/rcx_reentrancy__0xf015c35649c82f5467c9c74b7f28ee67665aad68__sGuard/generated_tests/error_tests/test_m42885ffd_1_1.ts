import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42885ffd - reentrancy guard removed", function () {
  it("should detect missing nonReentrant modifier on Collect by performing reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the bank first by putting ether from attacker
    await attackerContract.connect(attacker).attackPut({ value: ethers.parseEther("2") });

    // Set unlock time in the past so Collect can be called
    await ethers.provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000) - 1000]);
    await ethers.provider.send("evm_mine");

    // The attacker contract will call Collect, which in its fallback will call Collect again
    // On original contract (with reentrancy guard): second call should revert
    // On mutant (without reentrancy guard): second call succeeds, draining more than allowed
    const initialBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    
    // Attempt the reentrancy attack
    const tx = await attackerContract.connect(attacker).attackCollect(ethers.parseEther("1"));
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    
    // If reentrancy succeeded (mutant), attacker contract balance increased more than expected
    // If reentrancy failed (original), attacker contract balance increased by exactly 1 ETH
    const balanceDiff = finalBalance - initialBalance;
    
    // Mutant allows double withdrawal (2 ETH instead of 1 ETH)
    expect(balanceDiff).to.be.gt(ethers.parseEther("1.5"));
  });
});