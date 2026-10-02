import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m2e14c9f0 - clearRequest multiplication vs addition", function () {
  it("should detect mutant that replaces addition with multiplication in clearRequest loan amount calculation", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory which deploys the Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: borrower makes a loan request with amount = 1000, interest = 100 (10% for simplicity)
    const loanAmount = ethers.parseEther("1000");
    const interestRate = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Borrower needs to approve and transfer collateral to the cooler
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralNeeded);
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);
    
    // Get the request ID (should be 0)
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;
    
    // Calculate expected interest for 30 days
    const expectedInterest = await cooler.interestFor(loanAmount, interestRate, duration);
    
    // Lender needs to approve debt tokens to be transferred
    await debt.connect(lender).approve(await cooler.getAddress(), loanAmount);
    
    // Lender clears the request
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Get the created loan (loan ID 0)
    const loan = await cooler.getLoan(0);
    
    // In the original contract, loan amount should be req.amount + interest
    // In the mutant, it would be req.amount * interest
    const expectedLoanAmount = loanAmount + expectedInterest;
    
    // The mutant would produce a vastly different value (multiplication instead of addition)
    // req.amount * interest would be enormous compared to req.amount + interest
    expect(loan.amount).to.equal(expectedLoanAmount);
    
    // Additionally verify the loan was created correctly
    expect(loan.lender).to.equal(lender.address);
    expect(loan.collateral).to.equal(collateralNeeded);
    expect(loan.expiry).to.be.gt(0);
  });
});