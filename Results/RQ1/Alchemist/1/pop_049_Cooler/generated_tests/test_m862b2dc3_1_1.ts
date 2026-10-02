import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m862b2dc3 - approveTransfer access control", function () {
  it("should revert when lender calls approveTransfer (mutant breaks lender access)", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner (the borrower/owner)
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 3600; // 30 days

    // Owner needs to approve collateral transfer first
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now lender (who is the lender of loanID 0) tries to call approveTransfer
    // The mutant changes != to >=, so lender (msg.sender == loans[0].lender) will revert
    // because msg.sender >= lender is true when they are equal
    await expect(
      cooler.connect(lender).approveTransfer(borrower.address, 0)
    ).to.be.reverted;
  });
});