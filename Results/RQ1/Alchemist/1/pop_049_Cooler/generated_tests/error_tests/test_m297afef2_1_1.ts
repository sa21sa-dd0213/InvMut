import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m297afef2 - isDefaulted", function () {
  it("should detect mutant that removes the return statement from isDefaulted", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy CoolerFactory (which deploys the Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COLL", 18);
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(collateral.target, debt.target);
    const coolerAddress = await factory.coolersFor(collateral.target, debt.target, 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 200% collateral ratio
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Borrower needs collateral tokens
    await collateral.mint(borrower.address, ethers.parseEther("1000"));
    await collateral.connect(borrower).approve(coolerAddress, ethers.parseEther("1000"));

    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);

    await cooler.connect(lender).clearRequest(0, false, false);

    // Get the loan ID (should be 0)
    const loan = await cooler.getLoan(0);

    // Initially the loan should NOT be defaulted
    expect(await cooler.isDefaulted(0)).to.be.false;

    // Fast forward past the expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now the loan SHOULD be defaulted - the mutant would return false here
    expect(await cooler.isDefaulted(0)).to.be.true;
  });
});