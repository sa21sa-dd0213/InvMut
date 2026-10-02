import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m9a5d74ff - rollLoan callback bypass", function () {
  it("should revert when rolling a loan without callback and lender is EOA", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolerFor(borrower.address, collateral.target, debt.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const loanAmount = ethers.parseEther("100");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint collateral to borrower and approve
    const collateralNeeded = loanAmount * 10n ** 18n / loanToCollateral;
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(coolerAddress, collateralNeeded);

    // Create loan request
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Lender clears the request WITHOUT callback (isCallback_ = false)
    // Mint debt tokens to lender and approve
    await debt.mint(lender.address, loanAmount);
    await debt.connect(lender).approve(coolerAddress, loanAmount);

    // Clear request with repayDirect=false and isCallback=false
    await cooler.connect(lender).clearRequest(0, false, false);

    // Provide new terms for roll (so request stays active)
    const newInterest = ethers.parseEther("0.15");
    const newLTC = ethers.parseEther("2.5");
    const newDuration = 60 * 24 * 60 * 60;
    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLTC, newDuration);

    // Attempt to roll the loan - in original, this would succeed because callback check prevents
    // calling onRoll on an EOA. In mutant, it will try to call onRoll on lender (EOA) and revert.
    // The borrower should be able to roll since they are the owner
    await expect(
      cooler.connect(borrower).rollLoan(0)
    ).to.be.reverted;
  });
});