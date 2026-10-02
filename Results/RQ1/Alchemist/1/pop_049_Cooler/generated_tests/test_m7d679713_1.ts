import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m7d679713 - rollLoan active request check", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Get the Cooler implementation address from factory
    coolerImplementation = await coolerFactory.coolerImplementation();

    // Generate a Cooler for owner with the tokens
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address for owner
    const coolers = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    cooler = await ethers.getContractAt("Cooler", coolers[0]);

    // Mint tokens to owner and lender for testing
    await collateralToken.mint(owner.address, ethers.parseEther("1000"));
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await collateralToken.connect(owner).approve(await cooler.getAddress(), ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(await cooler.getAddress(), ethers.parseEther("1000"));
  });

  it("should allow owner to roll a loan when the request is active", async function () {
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Lender clears the request
    await cooler.connect(lender).clearRequest(0, false, false);
    
    // Provide new terms for roll (make the request active again)
    const newInterest = ethers.parseEther("0.15");
    const newLoanToCollateral = ethers.parseEther("2.5");
    const newDuration = 60 * 24 * 60 * 60; // 60 days
    await cooler.connect(lender).provideNewTermsForRoll(0, newInterest, newLoanToCollateral, newDuration);
    
    // Owner should be able to roll the loan (should NOT revert)
    await expect(cooler.connect(owner).rollLoan(0)).to.not.be.reverted;
  });
});