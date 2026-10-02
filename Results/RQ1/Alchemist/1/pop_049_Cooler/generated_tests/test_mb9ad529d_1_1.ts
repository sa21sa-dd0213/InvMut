import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb9ad529d - repayLoan overpayment cap", function () {
  it("should cap repayment to loan amount when repaying more than owed", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy the factory which deploys the Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs collateral tokens
    await collateral.mint(owner.address, ethers.parseEther("1000"));
    await collateral.connect(owner).approve(coolerAddress, ethers.parseEther("1000"));

    // Owner requests a loan
    const collateralRequired = await cooler.collateralFor(amount, loanToCollateral);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.mint(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(lender).clearRequest(0, true, false);

    // Get loan details
    const loan = await cooler.getLoan(0);
    const loanAmount = loan.amount;

    // Owner tries to repay more than the loan amount
    const overpayment = loanAmount + ethers.parseEther("50");
    await debt.mint(owner.address, overpayment);
    await debt.connect(owner).approve(coolerAddress, overpayment);

    // Repay with amount greater than loan amount
    await cooler.connect(owner).repayLoan(0, overpayment);

    // Check that the loan amount was capped - the loan should now be fully repaid (amount = 0)
    const updatedLoan = await cooler.getLoan(0);
    expect(updatedLoan.amount).to.equal(0);

    // The collateral returned should be based on the full loan amount, not the overpayment
    // Since we repaid the full loan amount (capped), all collateral should be returned
    expect(updatedLoan.collateral).to.equal(0);
  });
});