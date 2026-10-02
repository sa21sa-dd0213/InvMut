import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mde6e7359 - provideNewTermsForRoll", function () {
  it("should allow lender to provide new terms for roll, but mutant always reverts", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy CoolerFactory (which deploys Cooler implementation)
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();
    
    // Generate a cooler for borrower with collateral and debt tokens
    await factory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    
    // Get the cooler address
    const coolersFor = await factory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Create a loan request first
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5%
    const loanToCollateral = ethers.parseEther("2"); // 200% collateral
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Owner needs to approve and provide collateral
    await collateralToken.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await debtToken.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now lender should be able to provide new terms for roll
    const newInterest = ethers.parseEther("0.03");
    const newLoanToCollateral = ethers.parseEther("3");
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    
    // This should succeed for the lender in the original contract
    // but should revert in the mutant because condition is always true
    await expect(
      cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration)
    ).to.not.be.reverted;
    
    // Verify the loan request was updated
    const loan = await cooler.getLoan(0);
    expect(loan.request.interest).to.equal(newInterest);
    expect(loan.request.loanToCollateral).to.equal(newLoanToCollateral);
    expect(loan.request.duration).to.equal(newDuration);
  });
});