import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant md1c54cb8 - repayLoan proportional collateral calculation", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let borrower: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 mock tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COLL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactoryFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for borrower
    await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address from the factory
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should correctly calculate proportional collateral returned when repaying partial loan amount", async function () {
    // Setup: borrower creates a loan request
    const loanAmount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint tokens to borrower for collateral
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateralToken.mint(borrower.address, collateralNeeded);
    await collateralToken.connect(borrower).approve(await cooler.getAddress(), collateralNeeded);

    // Request loan
    await cooler.connect(borrower).requestLoan(loanAmount, interest, loanToCollateral, duration);

    // Mint debt tokens to lender
    await debtToken.mint(lender.address, loanAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), loanAmount);

    // Clear the request (lender funds the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now borrower repays half the loan
    const repayAmount = ethers.parseEther("50"); // Repay 50 out of 100

    // Mint debt tokens to borrower for repayment
    await debtToken.mint(borrower.address, repayAmount);
    await debtToken.connect(borrower).approve(await cooler.getAddress(), repayAmount);

    // Get collateral balance before repayment
    const collateralBalanceBefore = await collateralToken.balanceOf(borrower.address);

    // Repay the loan
    await cooler.connect(borrower).repayLoan(0, repayAmount);

    // Calculate expected decollateralized: (collateral * repaid) / loan.amount
    // Original: (collateralNeeded * 50) / 100 = collateralNeeded / 2
    const expectedDecollateralized = (collateralNeeded * repayAmount) / loanAmount;

    // Verify collateral returned to borrower
    const collateralBalanceAfter = await collateralToken.balanceOf(borrower.address);
    const actualReturned = collateralBalanceAfter - collateralBalanceBefore;

    // The mutant would return (collateral + repaid) / loan.amount = (collateralNeeded + 50) / 100
    // which is a different value than the expected proportional amount
    expect(actualReturned).to.equal(expectedDecollateralized);
  });
});