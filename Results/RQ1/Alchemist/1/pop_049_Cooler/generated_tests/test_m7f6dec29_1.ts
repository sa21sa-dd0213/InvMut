import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m7f6dec29 - repayLoan", function () {
  it("should successfully repay a loan when decollateralized > 0, but mutant always reverts", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower requests a loan
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralNeeded);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Verify loan was created
    const loan = await cooler.getLoan(0);
    expect(loan.amount).to.equal(amount + await cooler.interestFor(amount, interest, duration));

    // Borrower repays a portion of the loan (decollateralized will be > 0)
    const repayAmount = ethers.parseEther("100");
    await debt.connect(borrower).approve(await cooler.getAddress(), repayAmount);

    // This should succeed in original but revert in mutant (since mutant replaces decollateralized == 0 with true)
    await expect(cooler.connect(borrower).repayLoan(0, repayAmount)).to.not.be.reverted;
  });
});