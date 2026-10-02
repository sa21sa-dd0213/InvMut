import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb927b060 - repayLoan zero collateral revert", function () {
  it("should revert when decollateralized amount is zero in original, but succeed in mutant", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 token for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();

    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateralToken.getAddress(), await debtToken.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Borrower needs to have collateral tokens
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.mint(borrower.address, collateralNeeded);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralNeeded);

    // Create loan request
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now attempt to repay with a very small amount that results in zero decollateralized
    const tinyRepayment = ethers.parseEther("0.000000000000000001"); // 1 wei

    // This should revert on original contract with ZeroCollateralReturned
    await expect(
      cooler.connect(borrower).repayLoan(0, tinyRepayment)
    ).to.be.revertedWithCustomError(cooler, "ZeroCollateralReturned");
  });
});