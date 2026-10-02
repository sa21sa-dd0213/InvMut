import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mcdd65ca3 - rollLoan without NotRollable revert", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let collateralToken: any;
  let debtToken: any;
  let owner: any;
  let lender: any;
  let borrower: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await Factory.deploy();
    await coolerFactory.waitForDeployment();

    // Get cooler implementation address
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a cooler for the borrower with collateral and debt tokens
    await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address for this borrower
    const coolersFor = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    
    // Attach to the cooler contract
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Mint tokens and approve
    const loanAmount = ethers.parseEther("1000");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);

    // Mint tokens to borrower
    await collateralToken.mint(borrower.address, collateralNeeded);
    await debtToken.mint(lender.address, loanAmount);

    // Approve cooler to spend tokens
    await collateralToken.connect(borrower).approve(coolerAddress, collateralNeeded);
    await debtToken.connect(lender).approve(coolerAddress, loanAmount);

    // Create a loan request
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Clear the request (lender provides the loan)
    await cooler.connect(lender).clearRequest(0, false, false);
  });

  it("should revert when rolling a loan with an inactive request (mutant removal of revert)", async function () {
    // After clearing the request, the request becomes inactive (active = false)
    // Now try to roll the loan - this should revert in original but succeed in mutant
    
    // First get the loan details
    const loan = await cooler.getLoan(0);
    expect(loan.request.active).to.be.false; // Verify request is now inactive

    // Try to roll the loan - this should revert in original contract
    // but the mutant removes the revert, so it would proceed
    await expect(
      cooler.connect(borrower).rollLoan(0)
    ).to.be.revertedWith("NotRollable");
  });
});