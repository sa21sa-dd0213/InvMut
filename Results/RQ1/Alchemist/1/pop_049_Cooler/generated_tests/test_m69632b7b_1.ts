import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant kill test - repayLoan zero collateral check", function () {
  it("should kill mutant by showing that a valid partial repayment does not revert in original but reverts in mutant", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const CollateralToken = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await CollateralToken.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    const DebtToken = await ethers.getContractFactory("ERC20Mock");
    const debtToken = await DebtToken.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();
    
    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Mint tokens to owner for collateral
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.mint(owner.address, collateralNeeded);
    await collateralToken.connect(owner).approve(coolerAddress, collateralNeeded);
    
    // Owner requests loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, true, false);
    
    // Now test repayLoan with an amount that produces non-zero decollateralized
    const loan = await cooler.getLoan(0);
    const repayAmount = loan.amount / BigInt(2); // Repay half the loan
    
    // Borrower needs to have debt tokens
    await debtToken.mint(borrower.address, repayAmount);
    await debtToken.connect(borrower).approve(coolerAddress, repayAmount);
    
    // This should succeed in original but revert in mutant
    // In original: decollateralized > 0, so no revert
    // In mutant: decollateralized != 0, so it reverts with ZeroCollateralReturned
    await expect(
      cooler.connect(borrower).repayLoan(0, repayAmount)
    ).to.not.be.reverted;
    
    // Verify collateral was transferred to owner
    const decollateralized = (loan.collateral * repayAmount) / loan.amount;
    const ownerBalance = await collateralToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(decollateralized);
  });
});