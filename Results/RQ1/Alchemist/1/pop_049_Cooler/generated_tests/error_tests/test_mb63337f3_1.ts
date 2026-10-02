import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mb63337f3 - isDefaulted boundary test", function () {
  it("should return false when block.timestamp equals loan expiry, but mutant returns true", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();
    
    // Deploy factory and get cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();
    
    // Generate cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Setup: borrower creates a loan request
    const loanAmount = ethers.parseEther("100");
    const interestRate = ethers.parseEther("0.1"); // 10%
    const loanToCollateral = ethers.parseEther("2"); // 200% collateralization
    const duration = 86400; // 1 day in seconds
    
    // Borrower needs to approve and deposit collateral
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(borrower).requestLoan(loanAmount, interestRate, loanToCollateral, duration);
    
    // Lender clears the request
    await debt.connect(lender).approve(await cooler.getAddress(), loanAmount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Get loan ID and its expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;
    
    // Mine blocks to reach exactly the expiry timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry)]);
    await ethers.provider.send("evm_mine");
    
    // Now block.timestamp == loan.expiry
    // Original: should return false (not defaulted)
    // Mutant: would return true (incorrectly considers it defaulted)
    const isDefaulted = await cooler.isDefaulted(0);
    expect(isDefaulted).to.equal(false);
  });
});