import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mabda7a85 - repayLoan default check", function () {
  it("should revert when repaying an expired loan", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate cooler for owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Mint tokens and approve
    const loanAmount = ethers.parseEther("1000");
    const interest = ethers.parseEther("10"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 86400; // 1 day in seconds

    // Calculate collateral needed
    const collateralNeeded = await cooler.collateralFor(loanAmount, loanToCollateral);

    // Mint and approve collateral tokens for borrower
    await collateralToken.mint(borrower.address, collateralNeeded);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralNeeded);

    // Create loan request
    await cooler.connect(borrower).requestLoan(loanAmount, interest, loanToCollateral, duration);

    // Mint and approve debt tokens for lender to clear request
    await debtToken.mint(lender.address, loanAmount);
    await debtToken.connect(lender).approve(coolerAddress, loanAmount);

    // Clear the request (create the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get loan details to verify expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Fast forward time past expiry
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry) + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to repay the expired loan - should revert with Default()
    const repayAmount = ethers.parseEther("100");
    await debtToken.mint(borrower.address, repayAmount);
    await debtToken.connect(borrower).approve(coolerAddress, repayAmount);

    await expect(
      cooler.connect(borrower).repayLoan(0, repayAmount)
    ).to.be.revertedWith("Default");
  });
});