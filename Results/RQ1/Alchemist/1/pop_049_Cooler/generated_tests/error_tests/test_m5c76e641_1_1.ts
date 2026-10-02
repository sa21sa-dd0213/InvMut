import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m5c76e641 - rollLoan default check", function () {
  it("should revert when rolling an expired loan, but mutant allows it", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy the CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 86400; // 1 day

    // Approve and deposit collateral
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralNeeded);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    const debtAmount = amount;
    await debt.connect(lender).approve(coolerAddress, debtAmount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Get the loan
    const loan = await cooler.getLoan(0);

    // Fast forward past expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to roll the expired loan - should revert in original, but mutant allows it
    await expect(
      cooler.connect(owner).rollLoan(0)
    ).to.be.revertedWith("Default");
  });
});