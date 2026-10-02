import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - interestFor operator replacement", function () {
  it("should kill mutant m0563d893 by verifying correct interest calculation", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COLL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interestRate = ethers.parseEther("0.05"); // 5% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 30 * 24 * 60 * 60; // 30 days in seconds

    // Calculate expected collateral needed
    const collateralDecimals = await collateralToken.decimals();
    const expectedCollateral = (amount * BigInt(10 ** Number(collateralDecimals))) / loanToCollateral;

    // Mint tokens and approve
    await collateralToken.mint(borrower.address, expectedCollateral);
    await collateralToken.connect(borrower).approve(coolerAddress, expectedCollateral);
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(coolerAddress, amount);

    // Borrower creates request
    await cooler.connect(borrower).requestLoan(amount, interestRate, loanToCollateral, duration);

    // Calculate expected interest using original formula: (rate * duration) / 365 days
    const expectedInterest = (interestRate * BigInt(duration)) / BigInt(365 * 24 * 60 * 60);
    const expectedTotalAmount = amount + (amount * expectedInterest) / ethers.parseEther("1");

    // Lender clears the request
    await cooler.connect(lender).clearRequest(0, true, false);

    // Get the loan details
    const loan = await cooler.getLoan(0);

    // Assert that the loan amount equals the expected calculated amount
    // The mutant would produce: amount + (rate * duration) + 365 days = amount + huge value
    // The original produces: amount + (rate * duration / 365 days) = reasonable value
    expect(loan.amount).to.equal(expectedTotalAmount);

    // Additional verification: mutant would create absurdly large interest
    // Calculate what mutant would produce
    const mutantInterest = (interestRate * BigInt(duration)) + BigInt(365 * 24 * 60 * 60);
    const mutantTotalAmount = amount + (amount * mutantInterest) / ethers.parseEther("1");

    // The mutant value should be much larger than the original
    expect(mutantTotalAmount).to.be.gt(expectedTotalAmount * BigInt(1000));
  });
});