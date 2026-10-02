import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m285719a4 - repayLoan timestamp check", function () {
  it("should revert with Default when repaying an expired loan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower requests a loan
    const loanAmount = ethers.parseEther("100");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 3600; // 1 hour

    // Borrower approves and provides collateral
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);

    const reqID = await cooler.connect(borrower).requestLoan.staticCall(loanAmount, interestRate, loanToCollateral, duration);
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);

    // Lender clears the request
    await debt.mint(lender.address, loanAmount);
    await debt.connect(lender).approve(coolerAddress, loanAmount);

    const loanID = await cooler.connect(lender).clearRequest.staticCall(0, false, false);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Fast forward time past loan expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    // Borrower tries to repay the expired loan - should revert with Default
    await expect(
      cooler.connect(borrower).repayLoan(0, loanAmount)
    ).to.be.revertedWith("Default");
  });
});