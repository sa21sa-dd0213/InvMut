import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mf03e57c3 - clearRequest always reverts", function () {
  it("should succeed when calling clearRequest with isCallback_ = false", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy the CoolerFactory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Get the Cooler implementation address from the factory
    const coolerImplAddress = await factory.coolerImplementation();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address for this borrower
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler contract instance
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Borrower makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Mint tokens to borrower and approve
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));
    
    // Request loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Get the request ID (should be 0)
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;
    
    // Now call clearRequest with isCallback_ = false (should succeed on original, fail on mutant)
    await expect(
      cooler.connect(lender).clearRequest(0, false, false)
    ).to.not.be.reverted;
    
    // Verify the loan was created
    const loan = await cooler.getLoan(0);
    expect(loan.lender).to.equal(lender.address);
  });
});