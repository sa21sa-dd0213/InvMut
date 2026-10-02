import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant kill test - transferOwnership authorization", function () {
  it("should revert when unauthorized user calls transferOwnership", async function () {
    const [owner, lender, unauthorizedUser] = await ethers.getSigners();

    // Deploy the factory first
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Create mock ERC20 tokens for collateral and debt
    const MockERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: create a loan with lender
    const loanAmount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner requests a loan
    const collateralAmount = await cooler.collateralFor(loanAmount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    await cooler.connect(owner).requestLoan(loanAmount, interest, loanToCollateral, duration);

    // Lender clears the request (creates loan ID 0)
    const debtAmount = loanAmount; // amount lender needs to provide
    await debt.connect(lender).approve(coolerAddress, debtAmount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Approve transfer to owner (so owner can transfer ownership)
    await cooler.connect(lender).approveTransfer(owner.address, 0);

    // Attempt: unauthorized user tries to call transferOwnership for loan ID 0
    // This should revert because unauthorizedUser is not the approved address (owner is)
    await expect(
      cooler.connect(unauthorizedUser).transferOwnership(0)
    ).to.be.reverted;
  });
});