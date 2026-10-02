import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Cooler reference (ethers v6)", function () {
  it("should revert when claimDefaulted is called exactly at loan expiry (mutant mda822484 detection)", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a Cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Prepare loan parameters
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Borrower requests a loan and provides collateral
    const collateralRequired = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralRequired);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get the loan ID (should be 0)
    const loan = await cooler.getLoan(0);

    // Advance time to exactly the loan expiry
    await time.setNextBlockTimestamp(loan.expiry);

    // Attempt to claim defaulted at exactly expiry - should revert with NoDefault
    await expect(cooler.connect(lender).claimDefaulted(0))
      .to.be.revertedWithCustomError(cooler, "NoDefault");
  });
});