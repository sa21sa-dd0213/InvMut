import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m7bdea67a - newCollateralFor division bug", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;
  let coolerImplementation: any;

  before(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the cooler implementation address from the factory
    coolerImplementation = await coolerFactory.coolerImplementation();
  });

  it("should detect the division bug in newCollateralFor when rolling a loan", async function () {
    // Generate a cooler for owner with collateral and debt tokens
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address for this combination
    const coolersFor = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    
    // Attach to the cooler
    const Cooler = await ethers.getContractFactory("Cooler");
    cooler = Cooler.attach(coolerAddress);

    // Owner creates a loan request: amount 1000, interest 5%, loanToCollateral 200%, duration 30 days
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 200% collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Calculate collateral needed: (amount * 10^18) / loanToCollateral = (1000 * 1) / 2 = 500 tokens
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    
    // Owner approves and transfers collateral to the cooler
    await collateralToken.connect(owner).approve(coolerAddress, collateralNeeded);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request with repayDirect=false and callback=false
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get loan details to know current collateral
    const loan = await cooler.getLoan(0);
    const currentCollateral = loan.collateral;
    
    // Owner provides new terms for roll: higher interest, lower collateral ratio
    const newInterest = ethers.parseEther("0.1"); // 10% interest
    const newLoanToCollateral = ethers.parseEther("1.5"); // 150% collateral ratio
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    
    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration);

    // Calculate expected new collateral using the original formula
    // newCollateralFor = neededCollateral - loan.collateral
    // neededCollateral = (loan.amount * 10^18) / newLoanToCollateral
    const neededCollateral = await cooler.collateralFor(loan.amount, newLoanToCollateral);
    const expectedNewCollateral = neededCollateral - currentCollateral;

    // Get the actual newCollateralFor from the contract
    const actualNewCollateral = await cooler.newCollateralFor(0);

    // The mutant uses division instead of subtraction
    // expectedNewCollateral = neededCollateral - loan.collateral
    // mutant would compute: neededCollateral / loan.collateral
    // These will be different values, so we assert the correct behavior
    expect(actualNewCollateral).to.equal(expectedNewCollateral);
    
    // If the contract has the bug, the division result will not equal the subtraction result
    // This test will fail on the mutant, detecting it
  });
});