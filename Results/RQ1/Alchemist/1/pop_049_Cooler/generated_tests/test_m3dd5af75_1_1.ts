import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m3dd5af75 - expiration calculation", function () {
  it("should revert with NoDefault when lender tries to claimDefault immediately after clearRequest (original behavior)", async function () {
    // Deploy necessary contracts
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20Factory.deploy("Debt", "DBT", 18);
    await debt.waitForDeployment();
    
    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(owner.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Borrower makes a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 7 * 24 * 60 * 60; // 7 days
    
    // Borrower needs collateral tokens
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(coolerAddress, collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender needs debt tokens
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    
    // Lender clears the request
    const tx = await cooler.connect(lender).clearRequest(0, false, false);
    await tx.wait();
    
    // Attempt to claim defaulted immediately - should revert with NoDefault
    // because expiration should be block.timestamp + duration (future)
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWithCustomError(cooler, "NoDefault");
  });
});