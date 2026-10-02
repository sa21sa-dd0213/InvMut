import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mcd5062af - rollLoan access control", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let other: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender, other] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy the CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Fund owner with collateral tokens
    await collateralToken.mint(owner.address, ethers.parseEther("1000"));
    await collateralToken.connect(owner).approve(coolerFactory.target, ethers.parseEther("1000"));

    // Generate cooler for owner
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get cooler address from factory
    const coolersFor = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should allow owner to call rollLoan (original behavior) and revert when non-owner calls (mutant detection)", async function () {
    // Setup: create a request and clear it to have a loan
    const loanAmount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner makes a loan request
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);

    // Mint and approve collateral to cooler
    await collateralToken.mint(owner.address, collateralNeeded);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralNeeded);

    await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);

    // Lender clears the request (needs debt tokens)
    await debtToken.mint(lender.address, loanAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), loanAmount);

    await cooler.connect(lender).clearRequest(0, false, false);

    // Provide new terms for roll
    await cooler.connect(lender).provideNewTermsForRoll(
      0,
      ethers.parseEther("0.15"),
      ethers.parseEther("2"),
      60 * 24 * 60 * 60
    );

    // Test 1: Owner (the borrower) should be able to call rollLoan
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.not.be.reverted;

    // Test 2: A non-owner should NOT be able to call rollLoan
    await expect(
      cooler.connect(other).rollLoan(0)
    ).to.be.reverted;
  });
});