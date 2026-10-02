import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m75f1aa46 - provideNewTermsForRoll access control", function () {
  it("should revert when called by the lender on mutant due to >= instead of !=", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy factory and cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COLL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Transfer collateral to borrower and approve
    await collateral.transfer(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    
    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Clear the request as lender
    await debt.transfer(lender.address, ethers.parseEther("1000"));
    await debt.connect(lender).approve(coolerAddress, ethers.parseEther("1000"));
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now try to provide new terms as the lender (should succeed on original, fail on mutant)
    const newInterest = ethers.parseEther("0.06");
    const newLoanToCollateral = ethers.parseEther("2.5");
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    
    // On original: lender == msg.sender, so != condition is false, no revert
    // On mutant: lender >= msg.sender is true (equal), so revert occurs
    await expect(
      cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration)
    ).to.not.be.reverted;
  });
});