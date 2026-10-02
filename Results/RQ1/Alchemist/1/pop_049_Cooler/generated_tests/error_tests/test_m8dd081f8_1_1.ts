import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m8dd081f8 - block.prevrandao vs block.timestamp", function () {
  it("should revert when claiming defaulted loan immediately after clearing request (mutant uses block.prevrandao for expiration)", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy a mock ERC20 for collateral and debt tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolerFor(borrower.address, collateral.target, debt.target);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Borrower makes a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Mint tokens and approve
    const collateralNeeded = (amount * BigInt(10 ** 18)) / loanToCollateral;
    await collateral.mint(borrower.address, collateralNeeded);
    await collateral.connect(borrower).approve(coolerAddress, collateralNeeded);

    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request (this is where the mutant changes block.timestamp to block.prevrandao)
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Immediately try to claim defaulted - should revert because loan just started
    // In original: expiration = block.timestamp + duration -> loan is not expired
    // In mutant: expiration = block.prevrandao + duration -> enormous value, never expires
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWithCustomError(cooler, "NoDefault");
  });
});