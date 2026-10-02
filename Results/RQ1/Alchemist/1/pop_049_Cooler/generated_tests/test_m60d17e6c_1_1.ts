import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - newCollateralFor", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with these tokens
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

  it("should return 0 for newCollateralFor when existing collateral is sufficient", async function () {
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = 2; // 200% collateralization
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to have collateral tokens
    await collateralToken.mint(owner.address, ethers.parseEther("1000"));
    await collateralToken.connect(owner).approve(
      await cooler.getAddress(),
      ethers.parseEther("1000")
    );

    // Request a loan
    const reqID = await cooler.connect(owner).requestLoan(
      amount,
      interest,
      loanToCollateral,
      duration
    );
    await reqID.wait();

    // Lender clears the request with repayDirect = false and callback = false
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(
      await cooler.getAddress(),
      ethers.parseEther("1000")
    );

    const clearTx = await cooler.connect(lender).clearRequest(0, false, false);
    await clearTx.wait();

    // Now get the loan to check its collateral
    const loan = await cooler.getLoan(0);
    const initialCollateral = loan.collateral;

    // Owner provides new roll terms with a lower loanToCollateral ratio
    // This means less collateral is needed, so existing collateral is sufficient
    const lowerLoanToCollateral = 1; // 100% collateralization
    await cooler.connect(lender).provideNewTermsForRoll(
      0,
      interest,
      lowerLoanToCollateral,
      duration
    );

    // Get the newCollateralFor calculation
    const newCollateral = await cooler.newCollateralFor(0);

    // Since we lowered the loanToCollateral ratio, the needed collateral is less
    // than the existing collateral, so newCollateral should be 0
    expect(newCollateral).to.equal(0);

    // Now attempt to roll the loan - should succeed without requiring additional collateral
    await expect(cooler.connect(owner).rollLoan(0)).to.not.be.reverted;

    // Verify the loan was rolled successfully (collateral unchanged since no new needed)
    const updatedLoan = await cooler.getLoan(0);
    expect(updatedLoan.collateral).to.equal(initialCollateral);
  });
});