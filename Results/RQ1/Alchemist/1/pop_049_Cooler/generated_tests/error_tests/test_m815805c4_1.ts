import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m815805c4 - repayLoan callback check", function () {
  let coolerImplementation: any;
  let factory: any;
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

    // Deploy the Cooler implementation and factory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await factory.coolersFor(collateralToken.target, debtToken.target, 0);
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should not call onRepay when callback is false on the loan", async function () {
    // Setup: Borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Borrower needs to have collateral tokens
    await collateralToken.mint(borrower.address, ethers.parseEther("1000"));
    await collateralToken.connect(borrower).approve(cooler.target, ethers.parseEther("1000"));

    // Create request
    const reqID = await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender needs debt tokens
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(cooler.target, ethers.parseEther("1000"));

    // Clear the request with callback = false
    const repayDirect = false;
    const isCallback = false;
    await cooler.connect(lender).clearRequest(0, repayDirect, isCallback);

    // Borrower gets debt tokens to repay
    await debtToken.mint(borrower.address, ethers.parseEther("200"));
    await debtToken.connect(borrower).approve(cooler.target, ethers.parseEther("200"));

    // Repay the full loan amount
    const loanID = 0;
    const repayAmount = ethers.parseEther("110"); // amount + interest

    // This should succeed in the original contract but revert in the mutant
    // because the mutant will try to call onRepay on the lender address
    // which is not a CoolerCallback contract
    await expect(
      cooler.connect(borrower).repayLoan(loanID, repayAmount)
    ).to.not.be.reverted;

    // Verify the loan state was updated correctly
    const loan = await cooler.getLoan(loanID);
    expect(loan.amount).to.equal(0);
    expect(loan.unclaimed).to.equal(repayAmount);
  });
});