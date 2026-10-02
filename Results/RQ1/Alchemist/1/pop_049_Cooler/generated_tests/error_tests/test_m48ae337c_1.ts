import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m48ae337c - claimDefaulted deadline check", function () {
  it("should revert when claiming defaulted loan before expiry, but mutant allows it", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2;
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Calculate required collateral
    const requiredCollateral = await cooler.collateralFor(amount, loanToCollateral);
    
    // Approve and transfer collateral to cooler
    await collateral.connect(borrower).approve(await cooler.getAddress(), requiredCollateral);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Get the request ID (should be 0)
    const request = await cooler.getRequest(0);
    
    // Lender clears the request
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, true, false);

    // Attempt to claim defaulted loan BEFORE expiry (should revert with NoDefault)
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWith("NoDefault");
  });
});