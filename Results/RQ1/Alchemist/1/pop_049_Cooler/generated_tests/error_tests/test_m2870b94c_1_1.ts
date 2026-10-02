import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m2870b94c - rollLoan authorization", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let borrower: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the cooler implementation address
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a cooler for the borrower
    await coolerFactory.connect(borrower).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await coolerFactory.coolerFor(borrower.address, collateralToken.target, debtToken.target);
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint tokens to borrower
    await collateralToken.mint(borrower.address, ethers.parseEther("1000"));
    await debtToken.mint(lender.address, ethers.parseEther("1000"));

    // Approve cooler to spend borrower's collateral
    await collateralToken.connect(borrower).approve(cooler.target, ethers.parseEther("1000"));

    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Approve cooler to spend lender's debt
    await debtToken.connect(lender).approve(cooler.target, ethers.parseEther("1000"));

    // Clear the request to create a loan
    await cooler.connect(lender).clearRequest(0, false, false);

    // Provide new terms for roll
    const newInterest = ethers.parseEther("0.15");
    const newLoanToCollateral = ethers.parseEther("2.5");
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration);
  });

  it("should revert when non-owner calls rollLoan", async function () {
    // Attempt to roll the loan as a non-owner (lender)
    await expect(
      cooler.connect(lender).rollLoan(0)
    ).to.be.revertedWith("OnlyApproved");
  });
});