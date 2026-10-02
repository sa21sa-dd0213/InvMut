import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb2ced8fa - newCollateralFor", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  before(async function () {
    const [signer1, signer2] = await ethers.getSigners();
    owner = signer1;
    lender = signer2;

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Mock.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with collateral and debt tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const event = receipt.logs.find(
      (log: any) => log.eventName === undefined
    );
    // Alternative: use coolerFor mapping to get the cooler address
    const coolerAddress = await coolerFactory.coolerFor(
      owner.address,
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    
    // Get the Cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    cooler = Cooler.attach(coolerAddress);
  });

  it("should return positive additional collateral when neededCollateral > loan.collateral", async function () {
    // Setup: Create a loan request and clear it
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner approves and makes a loan request
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralNeeded);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, true, false);

    // Now modify the loan terms to require more collateral
    // Provide new terms with a higher loanToCollateral ratio (meaning less collateral per debt)
    const newInterest = ethers.parseEther("0.15");
    const newLoanToCollateral = ethers.parseEther("4"); // 4:1 ratio - requires more collateral
    const newDuration = 60 * 24 * 60 * 60; // 60 days

    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration);

    // Get current loan state
    const loan = await cooler.getLoan(0);
    const neededCollateral = await cooler.collateralFor(loan.amount, newLoanToCollateral);
    
    // Ensure neededCollateral > current loan.collateral
    expect(neededCollateral).to.be.gt(loan.collateral);

    // The newCollateralFor function should return the positive difference
    const additionalCollateral = await cooler.newCollateralFor(0);
    const expectedAdditional = neededCollateral - loan.collateral;
    
    // This will fail on the mutant because it uses < instead of >
    expect(additionalCollateral).to.equal(expectedAdditional);
  });
});