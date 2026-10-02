import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m0dbbad9d - repayLoan unclaimed tracking", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;
  let coolerAddress: string;

  before(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactoryFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with these tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();
    
    // Get the cooler address from the event or by querying
    const coolers = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    coolerAddress = coolers[0];
    
    // Attach to the cooler
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    cooler = CoolerFactory.attach(coolerAddress);
  });

  it("should correctly track unclaimed repaid amount when repayDirect is false", async function () {
    // Setup: Create a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Owner needs to approve and deposit collateral
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(coolerAddress, collateralAmount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request with repayDirect = false
    await debtToken.connect(lender).approve(coolerAddress, amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now owner repays part of the loan
    const repayAmount = ethers.parseEther("500");
    await debtToken.connect(owner).approve(coolerAddress, repayAmount);
    await cooler.connect(owner).repayLoan(0, repayAmount);

    // Get loan details to check unclaimed
    const loan = await cooler.getLoan(0);
    
    // The lender should be able to claim the repaid amount
    const lenderBalanceBefore = await debtToken.balanceOf(lender.address);
    await cooler.connect(lender).claimRepaid(0);
    const lenderBalanceAfter = await debtToken.balanceOf(lender.address);

    // Assert that the lender received the repaid amount
    // In the mutant, unclaimed was not updated, so this will fail
    expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(repayAmount);
  });
});