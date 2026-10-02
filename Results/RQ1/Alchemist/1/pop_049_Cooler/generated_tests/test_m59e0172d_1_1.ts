import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m59e0172d - repayLoan division replaced with subtraction", function () {
  it("should return correct proportional collateral when repaying a portion of the loan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory and Cooler
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Get cooler implementation address
    const coolerImpl = await factory.coolerImplementation();

    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateralToken.getAddress(), await debtToken.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Borrower provides collateral, lender provides debt
    const loanAmount = ethers.parseEther("1000");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 3600; // 30 days

    // Calculate required collateral
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);

    // Borrower approves and requests loan
    await collateralToken.connect(borrower).approve(coolerAddress, collateralNeeded);
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Lender approves and clears request
    await debtToken.connect(lender).approve(coolerAddress, loanAmount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get loan details before repayment
    const loanBefore = await cooler.getLoan(0);
    const collateralBefore = loanBefore.collateral;
    const amountBefore = loanBefore.amount;

    // Repay half the loan
    const repayAmount = amountBefore / 2n;
    await debtToken.connect(borrower).approve(coolerAddress, repayAmount);
    await cooler.connect(borrower).repayLoan(0, repayAmount);

    // Get loan details after repayment
    const loanAfter = await cooler.getLoan(0);

    // Calculate expected decollateralized amount: (collateral * repaid) / loan.amount
    const expectedDecollateralized = (collateralBefore * repayAmount) / amountBefore;

    // The actual decollateralized amount should equal the expected proportional amount
    // If mutant is present (subtraction), this will fail because:
    // (collateral * repaid) - loan.amount != (collateral * repaid) / loan.amount
    expect(loanAfter.collateral).to.equal(collateralBefore - expectedDecollateralized);
  });
});