import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m2c78a936 - getLoan return statement removal", function () {
  it("should kill the mutant by verifying getLoan returns correct loan data after clearRequest", async function () {
    const [owner, lender] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for collateral
    const MockERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    
    // Deploy a mock ERC20 token for debt
    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Deploy the CoolerFactory which deploys Cooler
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address from the factory
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Owner makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days
    
    // Transfer collateral tokens to owner for the request
    await collateral.connect(owner).approve(await cooler.getAddress(), ethers.parseEther("1000"));
    await collateral.connect(owner).mint(owner.address, ethers.parseEther("1000"));
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    const reqID = 0;
    const repayDirect = false;
    const isCallback = false;
    
    // Mint debt tokens to lender and approve
    await debt.connect(lender).mint(lender.address, amount);
    await debt.connect(lender).approve(await cooler.getAddress(), amount);
    
    await cooler.connect(lender).clearRequest(reqID, repayDirect, isCallback);
    
    // Now call getLoan and verify it returns the correct data
    const loanID = 0;
    const loan = await cooler.getLoan(loanID);
    
    // If the mutant removed the return statement, loan will be empty/zero struct
    // Verify that the loan has the expected lender address
    expect(loan.lender).to.equal(lender.address);
    
    // Verify other loan fields are populated correctly
    expect(loan.amount).to.equal(amount + (amount * interest * duration) / (365 * 24 * 60 * 60) / ethers.parseEther("1"));
    expect(loan.expiry).to.be.gt(0);
    expect(loan.collateral).to.be.gt(0);
  });
});