import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant ma7127bdd - kill test", function () {
  it("should allow Collect when balance > withdrawal amount in original, but fail in mutant due to <= comparison", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy BANK_SAFE (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy LogFile (no constructor arguments)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the contract
    await bank.SetLogFile(log.target);
    await bank.SetMinSum(10);
    await bank.Initialized();

    // Deposit 100 wei from user
    await bank.connect(user).Deposit({ value: 100 });

    // Verify balance is 100
    expect(await bank.balances(user.address)).to.equal(100);

    // Attempt to collect 50 wei (balance > withdrawal amount)
    // In original: 100 >= 50 is true -> succeeds
    // In mutant: 100 <= 50 is false -> reverts
    await expect(
      bank.connect(user).Collect(50)
    ).to.be.reverted;
  });
});