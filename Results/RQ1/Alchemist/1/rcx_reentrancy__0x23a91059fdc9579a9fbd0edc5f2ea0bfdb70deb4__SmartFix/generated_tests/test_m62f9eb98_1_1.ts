import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - CashOut balance mutation", function () {
  it("should detect mutant where CashOut adds instead of subtracts balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const cashOutAmount = ethers.parseEther("1");

    // Deposit from addr1
    await privateBank.connect(addr1).Deposit({ value: depositAmount });

    // Check initial balance after deposit
    const balanceAfterDeposit = await privateBank.balances(addr1.address);
    expect(balanceAfterDeposit).to.equal(depositAmount);

    // Cash out partial amount
    await privateBank.connect(addr1).CashOut(cashOutAmount);

    // Check balance after cash out - should be deposit minus cashout
    // In original: balance decreases (depositAmount - cashOutAmount)
    // In mutant: balance increases (depositAmount + cashOutAmount)
    const balanceAfterCashOut = await privateBank.balances(addr1.address);

    // This assertion will pass on original (balance = 1 ether)
    // and fail on mutant (balance = 3 ether), thus killing the mutant
    expect(balanceAfterCashOut).to.equal(depositAmount - cashOutAmount);
  });
});