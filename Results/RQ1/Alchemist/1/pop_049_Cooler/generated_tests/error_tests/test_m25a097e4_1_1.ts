import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant kill test - m25a097e4 (repayLoan division replaced with addition)", function () {
  it("should kill mutant by verifying correct decollateralized amount after partial repayment", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Calculate required collateral
    const collateralRequired = await cooler.collateralFor(amount, loanToCollateral);

    // Transfer tokens to borrower and approve
    await collateralToken._mint(borrower.address, collateralRequired);
    await debtToken._mint(lender.address, amount);

    await collateralToken.connect(borrower).approve(coolerAddress, collateralRequired);
    await debtToken.connect(lender).approve(coolerAddress, amount);

    // Borrower requests loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears request
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get loan details
    const loanBefore = await cooler.getLoan(0);
    const loanAmount = loanBefore.amount; // amount + interest
    const loanCollateral = loanBefore.collateral;

    // Calculate expected decollateralized for partial repayment
    const repaidAmount = ethers.parseEther("500"); // Repay half
    const expectedDecollateralized = (loanCollateral * repaidAmount) / loanAmount;

    // Get owner's collateral balance before repayment
    const ownerBalanceBefore = await collateralToken.balanceOf(owner.address);

    // Borrower needs debt tokens to repay - get them from lender
    await debtToken.connect(lender).transfer(borrower.address, repaidAmount);

    // Borrower repays
    await debtToken.connect(borrower).approve(coolerAddress, repaidAmount);
    await cooler.connect(borrower).repayLoan(0, repaidAmount);

    // Get owner's collateral balance after repayment
    const ownerBalanceAfter = await collateralToken.balanceOf(owner.address);
    const actualDecollateralized = ownerBalanceAfter - ownerBalanceBefore;

    // The mutant would return (loanCollateral * repaidAmount) + loanAmount instead of division
    // This would result in a much larger collateral transfer
    // The original should return exactly expectedDecollateralized
    expect(actualDecollateralized).to.equal(expectedDecollateralized);
  });
});