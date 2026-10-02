import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mc9d4f27a - repayLoan return value", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;
  let tokenFactory: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    tokenFactory = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await tokenFactory.deploy("Collateral", "COL", 18);
    debtToken = await tokenFactory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await Factory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the cooler implementation address
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a cooler for owner with collateral and debt tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    await tx.wait();

    // Get the cooler address
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should return correct decollateralized amount when repaying a loan", async function () {
    // Setup: Create a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);

    // Owner approves and requests loan
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralNeeded);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now repay half of the loan
    const repayAmount = amount / 2n;
    const expectedDecollateralized = (collateralNeeded * repayAmount) / amount;

    // Debt token approval for repayment
    await debtToken.connect(owner).approve(await cooler.getAddress(), repayAmount);

    // Use static call to get return value
    const decollateralized = await cooler.connect(owner).repayLoan.staticCall(0, repayAmount);
    
    expect(decollateralized).to.equal(expectedDecollateralized);
  });
});