import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc5340018 - repayLoan partial repayment test", function () {
  it("should allow partial repayment and correctly update loan state, but mutant forces full repayment", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await factory.coolerFor(owner.address, collateralToken.target, debtToken.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint collateral to owner and approve cooler
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.mint(owner.address, collateralNeeded);
    await collateralToken.connect(owner).approve(coolerAddress, collateralNeeded);

    // Create loan request
    const reqTx = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await reqTx.wait();

    // Lender clears the request
    const debtAmount = amount; // Lender needs to provide the debt amount
    await debtToken.mint(lender.address, debtAmount);
    await debtToken.connect(lender).approve(coolerAddress, debtAmount);

    const clearTx = await cooler.connect(lender).clearRequest(0, false, false);
    await clearTx.wait();

    // Get loan details
    const loanBefore = await cooler.getLoan(0);
    const totalDebt = loanBefore.amount; // amount + interest

    // Borrower repays only half of the debt
    const partialRepayment = totalDebt / 2n;

    // Mint debt tokens to borrower and approve
    await debtToken.mint(borrower.address, partialRepayment);
    await debtToken.connect(borrower).approve(coolerAddress, partialRepayment);

    // Attempt partial repayment
    await cooler.connect(borrower).repayLoan(0, partialRepayment);

    // Check loan state after repayment
    const loanAfter = await cooler.getLoan(0);

    // In the original contract, partial repayment should succeed and reduce loan amount
    // In the mutant, the full loan amount is repaid regardless of input
    // So we verify the loan amount is still > 0 (partial repayment worked)
    expect(loanAfter.amount).to.be.gt(0);
    expect(loanAfter.amount).to.be.lt(totalDebt);

    // Verify the remaining debt is correct (totalDebt - partialRepayment)
    const expectedRemaining = totalDebt - partialRepayment;
    expect(loanAfter.amount).to.equal(expectedRemaining);
  });
});