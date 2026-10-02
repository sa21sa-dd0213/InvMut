import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant kill test - me233de57", function () {
  it("should revert when repaying with amount that results in zero collateral returned", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    const coolerImpl = await CoolerFactory.deploy();
    await coolerImpl.waitForDeployment();

    // Deploy the factory that creates Cooler instances
    const FactoryFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await FactoryFactory.deploy();
    await factory.waitForDeployment();

    // Generate a Cooler instance for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Borrower needs to approve and deposit collateral
    const collateralAmount = (amount * 10n ** 18n) / loanToCollateral;
    await collateral.connect(borrower).mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.connect(lender).mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now the loan exists with ID 0
    // Try to repay with a very small amount (1 wei) that will result in zero collateral returned
    const tinyRepayment = 1n; // 1 wei
    await debt.connect(borrower).mint(borrower.address, tinyRepayment);
    await debt.connect(borrower).approve(coolerAddress, tinyRepayment);

    // This should revert with ZeroCollateralReturned in the original code
    // but in the mutant it will succeed incorrectly
    await expect(
      cooler.connect(borrower).repayLoan(0, tinyRepayment)
    ).to.be.revertedWith("ZeroCollateralReturned");
  });
});