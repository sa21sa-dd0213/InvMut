import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant mabf305e8 - provideNewTermsForRoll authorization", function () {
  let cooler: any;
  let owner: any;
  let lender: any;
  let attacker: any;
  let collateralToken: any;
  let debtToken: any;
  let factory: any;

  beforeEach(async function () {
    [owner, lender, attacker] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const FactoryFactory = await ethers.getContractFactory("CoolerFactory");
    factory = await FactoryFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(collateralToken.target, debtToken.target);
    const coolerAddress = await factory.coolersFor(collateralToken.target, debtToken.target, 0);
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should revert when non-lender calls provideNewTermsForRoll", async function () {
    // First create a loan request and clear it (so we have a loan)
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2;
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Owner requests a loan
    await collateralToken.connect(owner).approve(cooler.target, ethers.parseEther("200"));
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request (lender provides debt tokens)
    await debtToken.connect(lender).approve(cooler.target, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Now attacker tries to provide new terms for the loan (should revert)
    await expect(
      cooler.connect(attacker).provideNewTermsForRoll(
        0, // loanID
        ethers.parseEther("5"), // new interest
        3, // new loanToCollateral
        14 * 24 * 60 * 60 // new duration (14 days)
      )
    ).to.be.revertedWith("OnlyApproved");
  });

  it("should allow lender to provide new terms for roll", async function () {
    // Setup same as above
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2;
    const duration = 7 * 24 * 60 * 60;

    await collateralToken.connect(owner).approve(cooler.target, ethers.parseEther("200"));
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await debtToken.connect(lender).approve(cooler.target, amount);
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Lender should be able to provide new terms
    await expect(
      cooler.connect(lender).provideNewTermsForRoll(
        0,
        ethers.parseEther("5"),
        3,
        14 * 24 * 60 * 60
      )
    ).to.not.be.reverted;
  });
});