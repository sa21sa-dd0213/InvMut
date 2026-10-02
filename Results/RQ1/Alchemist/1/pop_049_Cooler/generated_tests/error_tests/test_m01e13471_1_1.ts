import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m01e13471 - rollLoan access control", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let borrower: any;
  let collateralToken: any;
  let debtToken: any;

  before(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();
  });

  it("should allow owner to roll a loan successfully when conditions are met", async function () {
    // Generate a cooler for the borrower
    const tx = await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const coolerAddress = receipt.logs[0].address;
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Approve and transfer collateral tokens to borrower
    const collateralAmount = (amount * ethers.parseEther("1")) / loanToCollateral;
    await collateralToken.mint(borrower.address, collateralAmount);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralAmount);

    // Create loan request
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(coolerAddress, amount);
    
    // Lender calls clearRequest with no callback and direct repay
    await cooler.connect(lender).clearRequest(0, true, false);

    // Now borrower should be able to roll the loan (as owner)
    // Provide new terms for rolling
    await cooler.connect(lender).provideNewTermsForRoll(
      0,
      ethers.parseEther("0.15"), // new interest
      ethers.parseEther("2.5"), // new loanToCollateral
      60 * 24 * 60 * 60 // 60 days duration
    );

    // The owner (borrower) should be able to call rollLoan without revert
    // This should NOT revert with OnlyApproved
    await expect(
      cooler.connect(borrower).rollLoan(0)
    ).to.not.be.reverted;

    // Verify the loan was rolled (amount increased)
    const loan = await cooler.getLoan(0);
    expect(loan.amount).to.be.gt(amount);
  });
});