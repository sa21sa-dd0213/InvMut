import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m3a96a595 - provideNewTermsForRoll", function () {
  it("should revert when called by a non-lender with address less than lender address", async function () {
    // Get signers
    const [owner, lender, nonLender] = await ethers.getSigners();
    
    // Ensure nonLender address is less than lender address for the test
    if (nonLender.address >= lender.address) {
      // Swap if needed to ensure nonLender < lender
      throw new Error("Test setup requires nonLender address < lender address");
    }

    // Deploy CoolerFactory first (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to approve collateral transfer
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    // Request loan
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender needs to approve debt transfer and clear the request
    await debt.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now try to call provideNewTermsForRoll from nonLender (address < lender)
    // This should revert on original but pass on mutant
    await expect(
      cooler.connect(nonLender).provideNewTermsForRoll(
        0, // loanID
        interest,
        loanToCollateral,
        duration
      )
    ).to.be.revertedWith("OnlyApproved");
  });
});