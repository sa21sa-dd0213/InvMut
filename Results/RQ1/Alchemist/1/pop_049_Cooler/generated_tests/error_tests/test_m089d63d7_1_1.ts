import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m089d63d7 - rollLoan with newCollateral >= 0", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with the tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    await tx.wait();

    // Get the cooler address from the event
    const coolerAddress = await coolerFactory.coolerFor(
      owner.address,
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should kill mutant m089d63d7 by rolling loan with zero new collateral needed", async function () {
    // Setup: Owner creates a loan request with high loanToCollateral ratio
    // This means low collateral required relative to loan amount
    const loanAmount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("10"); // High ratio = low collateral
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to approve collateral transfer
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateralToken.mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);

    // Owner requests loan
    await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.mint(lender.address, loanAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), loanAmount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now owner wants to roll the loan
    // We need to provide new terms that result in zero additional collateral
    // Since the loan has the same amount and the same loanToCollateral ratio,
    // the newCollateralFor will be 0 because existing collateral is sufficient
    await cooler.connect(lender).provideNewTermsForRoll(0, interest, loanToCollateral, duration);

    // This should succeed in original (skip zero transfer) but fail in mutant
    // because mutant tries to transfer 0 tokens with safeTransferFrom
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.not.be.reverted; // Original passes, mutant reverts due to zero transfer attempt

    // Verify loan state after roll
    const loan = await cooler.getLoan(0);
    expect(loan.request.active).to.equal(false); // Request should be deactivated after roll
    expect(loan.amount).to.be.gt(loanAmount); // Loan amount increased by interest
  });
});