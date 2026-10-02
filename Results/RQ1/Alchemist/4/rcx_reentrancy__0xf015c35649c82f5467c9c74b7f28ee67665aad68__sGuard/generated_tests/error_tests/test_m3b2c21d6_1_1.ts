import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m3b2c21d6 - reentrancy test", function () {
  it("should detect missing nonReentrant_ modifier in Put by reentering the function", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy the reentrancy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract with initial ETH to perform reentrancy
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2.0")
    });

    // Trigger the attack - this should revert on original but pass on mutant
    await expect(
      attackerContract.attack({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;

    // On mutant, the attack would succeed, meaning balance would be incorrectly doubled
    // Verify by checking that attacker's balance in bank is only the initial deposit (not doubled)
    const attackerBalance = await bank.Acc(await attackerContract.getAddress());
    expect(attackerBalance.balance).to.equal(ethers.parseEther("1.0"));
  });
});