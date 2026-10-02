import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant mdb8f570a - rollLoan collateral transfer", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;
  let reqID: number;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner
    await coolerFactory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await coolerFactory.coolersFor(collateralToken.target, debtToken.target, 0);
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Mint tokens to owner and lender
    const collateralAmount = ethers.parseEther("1000");
    const debtAmount = ethers.parseEther("10000");
    
    await collateralToken.mint(owner.address, collateralAmount);
    await debtToken.mint(lender.address, debtAmount);

    // Approve tokens
    await collateralToken.connect(owner).approve(cooler.target, collateralAmount);
    await debtToken.connect(lender).approve(cooler.target, debtAmount);

    // Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    const tx = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await tx.wait();
    
    reqID = 0;

    // Lender clears the request with repayDirect = false, callback = false
    await cooler.connect(lender).clearRequest(reqID, false, false);
  });

  it("should transfer additional collateral when rolling a loan with increased collateral requirement", async function () {
    // Get initial collateral balance of the cooler contract
    const initialCollateralBalance = await collateralToken.balanceOf(cooler.target);

    // Get the loan details
    const loan = await cooler.getLoan(0);
    
    // Lender provides new roll terms with higher loanToCollateral (requires more collateral)
    const newInterest = ethers.parseEther("0.15");
    const newLoanToCollateral = ethers.parseEther("3"); // Higher ratio means more collateral needed
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    
    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration);

    // Calculate expected new collateral needed
    const expectedNewCollateral = await cooler.newCollateralFor(0);
    
    // Owner approves additional collateral tokens
    await collateralToken.connect(owner).approve(cooler.target, expectedNewCollateral);

    // Owner rolls the loan
    await cooler.connect(owner).rollLoan(0);

    // Get final collateral balance
    const finalCollateralBalance = await collateralToken.balanceOf(cooler.target);
    
    // The collateral balance should have increased by the expected new collateral amount
    // If the mutant is active (condition changed to false), the transfer won't happen
    // and the collateral balance will remain the same, causing the assertion to fail
    expect(finalCollateralBalance - initialCollateralBalance).to.equal(expectedNewCollateral);
  });
});