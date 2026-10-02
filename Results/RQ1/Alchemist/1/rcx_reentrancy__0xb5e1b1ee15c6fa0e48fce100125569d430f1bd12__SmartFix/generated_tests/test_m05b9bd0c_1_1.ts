import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m05b9bd0c", function () {
  it("should reject deposit exactly equal to MinDeposit (1 ether) - mutant incorrectly allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by Private_Bank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Get initial balance of user
    const initialBalance = await bank.balances(user.address);

    // Send exactly 1 ether (MinDeposit) - should be rejected in original, but mutant allows it
    const tx = bank.connect(user).Deposit({ value: ethers.parseEther("1") });

    // In original: tx would revert because 1 ether is not > 1 ether
    // In mutant: tx succeeds because 1 ether + 1 > 1 ether
    // We expect revert for original, but mutant will pass - so we check balance didn't change
    await expect(tx).to.be.reverted;

    // Additional verification: balance should remain unchanged
    const finalBalance = await bank.balances(user.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});