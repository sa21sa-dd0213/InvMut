import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant kill test - mee399eaa", function () {
  it("should detect mutant by depositing with zero balance and expecting balance increase", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log contract address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit exactly 1 ether (MinDeposit = 1 ether) - this should succeed
    // Using exactly MinDeposit because require checks msg.value > MinDeposit (strictly greater)
    const depositAmount = ethers.parseEther("2");

    // Get initial balance of addr1
    const initialBalance = await bank.balances(addr1.address);
    expect(initialBalance).to.equal(0);

    // Deposit from addr1
    await bank.connect(addr1).Deposit({ value: depositAmount });

    // Check that balance increased (original contract: should pass; mutant: should revert)
    const finalBalance = await bank.balances(addr1.address);
    expect(finalBalance).to.equal(depositAmount);
  });
});