import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m6f93a777 - clearRequest interest calculation", function () {
  it("should detect mutant that subtracts interest instead of adding it by verifying loan amount equals principal plus interest", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory and Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interestRate = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 3600; // 30 days

    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);

    // Owner approves and transfers collateral to cooler
    await collateralToken.connect(owner).approve(coolerAddress, collateralNeeded);
    await cooler.connect(owner).requestLoan(amount, interestRate, loanToCollateral, duration);

    // Get the request ID
    const request = await cooler.getRequest(0);

    // Calculate expected interest
    const expectedInterest = await cooler.interestFor(amount, interestRate, duration);
    const expectedLoanAmount = amount + expectedInterest;

    // Lender approves debt token transfer
    await debtToken.connect(lender).approve(coolerAddress, amount);

    // Lender clears the request (no callback, direct repay)
    await cooler.connect(lender).clearRequest(0, true, false);

    // Get the loan details
    const loan = await cooler.getLoan(0);

    // Assert that loan amount is principal + interest (not principal - interest)
    // The mutant would set amount = amount - interest, making it smaller
    expect(loan.amount).to.equal(expectedLoanAmount);
    expect(loan.amount).to.be.gt(amount); // Loan amount should be greater than principal
  });
});