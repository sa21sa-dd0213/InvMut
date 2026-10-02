import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m5d7bf61e - repayLoan with repayDirect", function () {
  it("should send repayment directly to lender when repayDirect is true, not to contract", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5% annual
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint collateral to borrower and approve
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralNeeded);

    // Borrower requests loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears request with repayDirect = true
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, true, false);

    // Get lender's debt balance before repayment
    const lenderDebtBefore = await debt.balanceOf(lender.address);
    const coolerDebtBefore = await debt.balanceOf(await cooler.getAddress());

    // Borrower repays part of the loan
    const repayAmount = ethers.parseEther("50");
    await debt.mint(borrower.address, repayAmount);
    await debt.connect(borrower).approve(await cooler.getAddress(), repayAmount);
    await cooler.connect(borrower).repayLoan(0, repayAmount);

    // Check that lender received the repayment directly (balance increased)
    const lenderDebtAfter = await debt.balanceOf(lender.address);
    const coolerDebtAfter = await debt.balanceOf(await cooler.getAddress());

    // Original behavior: lender gets the repayment directly
    expect(lenderDebtAfter - lenderDebtBefore).to.equal(repayAmount);
    // Mutant behavior: contract would hold the funds as unclaimed
    expect(coolerDebtAfter).to.equal(coolerDebtBefore); // Contract balance shouldn't increase
  });
});