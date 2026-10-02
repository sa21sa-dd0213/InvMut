import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - mb7fbf425", function () {
  it("should kill mutant by verifying partial repayment correctly reduces loan amount", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolerFor(owner.address, await collateralToken.getAddress(), await debtToken.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to approve collateral transfer
    const collateralForAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralForAmount);
    
    // Create request
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender approves debt token and clears request
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, true, false);

    // Get loan details
    const loanBefore = await cooler.getLoan(0);
    const fullLoanAmount = loanBefore.amount; // amount + interest

    // Partial repayment (half of the loan)
    const partialRepayment = fullLoanAmount / 2n;
    await debtToken.connect(borrower).approve(await cooler.getAddress(), partialRepayment);
    
    // In mutant, this would set repaid_ = loan.amount (full amount) due to mutated condition
    // In original, it should cap at partial repayment since repaid_ < loan.amount
    await cooler.connect(borrower).repayLoan(0, partialRepayment);

    // Check loan amount after repayment
    const loanAfter = await cooler.getLoan(0);

    // In original: loan.amount should be reduced by partialRepayment
    // In mutant: loan.amount would be reduced by fullLoanAmount (incorrectly)
    const expectedRemaining = fullLoanAmount - partialRepayment;
    expect(loanAfter.amount).to.equal(expectedRemaining);
  });
});