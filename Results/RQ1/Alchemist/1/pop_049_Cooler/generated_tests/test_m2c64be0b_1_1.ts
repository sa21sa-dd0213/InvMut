import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m2c64be0b - claimDefaulted timing check", function () {
  it("should revert when claiming default before expiry, but mutant incorrectly allows it", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the borrower
    await factory.connect(borrower).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateralToken.getAddress(), await debtToken.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Borrower needs to approve and provide collateral
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Test: Try to claim default before expiry (block.timestamp < loan.expiry)
    // Get the loan expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Mine blocks to ensure we are before expiry
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expiry) - 1000]);
    await ethers.provider.send("evm_mine");

    // This should revert with NoDefault in original contract
    // In the mutant with == instead of <=, it will NOT revert (bug)
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWith("NoDefault");
  });
});