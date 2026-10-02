import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m4c9cd454 - Deposit condition replaced with false", function () {
  let privateBank: any;
  let log: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();
  });

  it("should fail on mutant when depositing more than MinDeposit (detects false condition)", async function () {
    const depositAmount = ethers.parseEther("2"); // > MinDeposit (1 ether)

    // Attempt deposit from user
    const tx = await privateBank.connect(user).Deposit({ value: depositAmount });
    await tx.wait();

    // In the original contract, balance should be updated
    // In the mutant, condition is always false, so balance remains 0
    const balance = await privateBank.balances(user.address);
    expect(balance).to.equal(depositAmount);
  });
});