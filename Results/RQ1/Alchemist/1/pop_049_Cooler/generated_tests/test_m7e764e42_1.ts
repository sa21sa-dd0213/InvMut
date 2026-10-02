import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - repayLoan default revert", function () {
  it("should revert when repaying a defaulted loan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Deploy the factory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolerFor(borrower.address, collateral.target, debt.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Borrower makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2; // 200% collateralization
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    
    // Mint tokens to borrower and approve
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(cooler.target, collateralNeeded);
    
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(cooler.target, amount);
    
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Fast forward past the loan expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to repay the defaulted loan - should revert
    await expect(
      cooler.connect(borrower).repayLoan(0, amount)
    ).to.be.revertedWith("Default");
  });
});