import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant m688561a3 - repayLoan exponentiation bug", function () {
  it("should revert or produce incorrect decollateralized amount when repaying with amount > 1", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Borrower needs to approve collateral transfer
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(borrower).mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralNeeded);

    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request with repayDirect = true, callback = false
    const reqID = 0;
    await debt.connect(lender).mint(lender.address, amount);
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(reqID, true, false);

    // Now test repayLoan - repay half the loan amount (50 DAI)
    const loanID = 0;
    const loan = await cooler.getLoan(loanID);
    const repayAmount = loan.amount / 2n; // Repay half = 50 DAI (since loan.amount = amount + interest)
    
    // Borrower needs to have debt tokens to repay
    await debt.connect(borrower).mint(borrower.address, repayAmount);
    await debt.connect(borrower).approve(await cooler.getAddress(), repayAmount);

    // The original would compute: (collateral * 50) / 100 = half collateral returned
    // The mutant computes: (collateral ** 50) / 100 = astronomically huge number (likely overflow/underflow)
    // This should either revert due to arithmetic underflow or produce wildly incorrect state
    
    // We expect either a revert OR the decollateralized amount to be impossibly large
    await expect(
      cooler.connect(borrower).repayLoan(loanID, repayAmount)
    ).to.be.reverted; // Mutant should revert due to massive exponentiation result causing underflow

    // Alternative assertion: if it doesn't revert, check state is corrupted
    const postLoan = await cooler.getLoan(loanID);
    // If mutant didn't revert, the collateral should have been reduced by more than was available
    // causing the loan.collateral to underflow (become extremely large due to uint256 wrapping)
    // or the decollateralized amount returned would be absurd
  });
});