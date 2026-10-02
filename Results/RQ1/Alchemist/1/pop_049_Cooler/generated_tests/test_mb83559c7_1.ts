import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb83559c7 - rollLoan access control", function () {
  it("should revert when non-owner calls rollLoan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy the factory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2;
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint and approve collateral for borrower
    const collateralAmount = (amount * 10n ** 18n) / BigInt(loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);
    
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now attempt to roll the loan as a non-owner (addr1)
    await expect(
      cooler.connect(addr1).rollLoan(0)
    ).to.be.revertedWith("OnlyApproved");
  });
});