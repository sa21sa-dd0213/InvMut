import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m5ae4be93 - newCollateralFor >= vs >", function () {
  it("should kill mutant when neededCollateral equals loan.collateral", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: Create a loan with specific parameters to make neededCollateral == loan.collateral on roll
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Calculate collateral needed for the loan
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    
    // Mint and approve tokens
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(coolerAddress, collateralNeeded);
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    
    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Clear request (lender provides terms)
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now roll the loan - set new terms so that neededCollateral equals current loan.collateral
    // The interest accrued should make the new collateral requirement equal to current collateral
    const loan = await cooler.getLoan(0);
    
    // Provide new roll terms that will make neededCollateral == loan.collateral
    // We need to calculate the exact interest rate and duration to achieve this
    const currentCollateral = loan.collateral;
    const currentAmount = loan.amount;
    
    // Set new terms where loanToCollateral is adjusted so neededCollateral equals currentCollateral
    // neededCollateral = (amount * 10^decimals) / loanToCollateral
    // We want: (currentAmount * 10^18) / newLoanToCollateral == currentCollateral
    // => newLoanToCollateral = (currentAmount * 10^18) / currentCollateral
    const newLoanToCollateral = (currentAmount * ethers.parseEther("1")) / currentCollateral;
    
    // Lender provides new roll terms
    await cooler.connect(lender).provideNewTermsForRoll(0, interest, newLoanToCollateral, duration);
    
    // Attempt to roll - this should succeed in original but fail in mutant
    // because mutant uses >= instead of >, causing it to require additional collateral when it's exactly equal
    await expect(
      cooler.connect(borrower).rollLoan(0)
    ).to.not.be.reverted;
    
    // Verify no additional collateral was transferred
    const borrowerBalanceAfter = await collateral.balanceOf(borrower.address);
    expect(borrowerBalanceAfter).to.equal(0); // Borrower shouldn't have spent more collateral
  });
});