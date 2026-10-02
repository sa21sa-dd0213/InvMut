import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mdca305fe - setDirectRepay always reverts", function () {
  it("should allow lender to call setDirectRepay successfully on original but fail on mutant", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy the CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);
    
    // Create a loan request first
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Borrower needs collateral tokens
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);
    
    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender needs debt tokens to clear the request
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    
    // Clear the request (create a loan)
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now test setDirectRepay - lender should be able to call it successfully
    // The mutant will revert with OnlyApproved() always
    await expect(
      cooler.connect(lender).setDirectRepay(0, true)
    ).to.not.be.reverted;
    
    // Verify the change was applied
    const loan = await cooler.getLoan(0);
    expect(loan.repayDirect).to.equal(true);
  });
});