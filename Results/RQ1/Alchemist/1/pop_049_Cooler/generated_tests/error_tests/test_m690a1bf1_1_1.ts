import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler reference (ethers v6)", function () {
  it("should revert when claiming default on a non-defaulted loan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for collateral and debt tokens
    const MockERC20 = await ethers.getContractFactory("ERC20Mock");
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Deploy the CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolerFor(owner.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: borrower creates a loan request
    const loanAmount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Borrower needs to have collateral tokens
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);
    
    await cooler.connect(borrower).requestLoan(loanAmount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    const reqID = 0;
    await debt.mint(lender.address, loanAmount);
    await debt.connect(lender).approve(coolerAddress, loanAmount);
    await cooler.connect(lender).clearRequest(reqID, false, false);
    
    // Try to claim default before the loan has expired - should revert
    const loanID = 0;
    await expect(
      cooler.connect(lender).claimDefaulted(loanID)
    ).to.be.revertedWithCustomError(cooler, "NoDefault");
  });
});