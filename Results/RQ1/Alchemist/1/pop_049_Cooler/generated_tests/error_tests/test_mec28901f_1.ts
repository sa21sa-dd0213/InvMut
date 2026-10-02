import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant kill test - rollLoan with zero newCollateral", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();

    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the implementation address
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a cooler for owner
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address
    const coolerAddress = await coolerFactory.coolerFor(
      owner.address,
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should revert when rolling a loan with zero newCollateral due to missing approval", async function () {
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to approve collateral transfer
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request with repayDirect=false and callback=false
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now owner wants to roll the loan
    // First, lender provides new terms with same loanToCollateral so newCollateral = 0
    // The loan amount is still 100 + interest
    const loan = await cooler.getLoan(0);
    const newTermsInterest = ethers.parseEther("0.1");
    const newTermsLTC = loanToCollateral; // Same ratio ensures newCollateral = 0
    const newTermsDuration = 30 * 24 * 60 * 60;

    await cooler.connect(lender).provideNewTermsForRoll(0, newTermsInterest, newTermsLTC, newTermsDuration);

    // Verify newCollateral is 0
    const newCollateral = await cooler.newCollateralFor(0);
    expect(newCollateral).to.equal(0);

    // Owner attempts to roll - this should succeed on original (skip transfer) 
    // but fail on mutant (attempts transfer of 0 without approval)
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.be.reverted;
  });
});