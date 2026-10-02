import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m65dbed95 - provideNewTermsForRoll access control", function () {
  it("should allow lender to call provideNewTermsForRoll and revert for mutant that blocks lender", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy CoolerFactory first
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20.deploy("Collateral", "COLL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();
    
    // Generate a cooler for owner with these tokens
    await factory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    
    // Get the cooler address
    const coolersFor = await factory.coolersFor(collateralToken.target, debtToken.target);
    const coolerAddress = coolersFor[0];
    
    // Get the cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Owner makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // First, mint and approve collateral for owner
    const collateralForRequest = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.mint(owner.address, collateralForRequest);
    await collateralToken.connect(owner).approve(coolerAddress, collateralForRequest);
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request (creates a loan)
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Owner provides new roll terms (this should work for the lender, not owner)
    // But we need to first set up the roll by having lender provide new terms
    // The function provideNewTermsForRoll should be callable by the lender
    
    // Try to call provideNewTermsForRoll as the lender (should succeed in original)
    // The mutant would revert this call
    const newInterest = ethers.parseEther("15");
    const newLoanToCollateral = ethers.parseEther("3");
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    
    await expect(
      cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration)
    ).to.not.be.reverted;
    
    // Verify the terms were updated
    const loan = await cooler.getLoan(0);
    expect(loan.request.interest).to.equal(newInterest);
    expect(loan.request.loanToCollateral).to.equal(newLoanToCollateral);
    expect(loan.request.duration).to.equal(newDuration);
  });
});