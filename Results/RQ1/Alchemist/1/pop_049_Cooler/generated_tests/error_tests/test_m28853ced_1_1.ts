import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler claimDefaulted mutant detection", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let borrower: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    lender = signers[1];
    borrower = signers[2];

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactoryFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for the borrower with the tokens
    await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should revert claimDefaulted when loan has not expired (mutant kills)", async function () {
    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest rate
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 7 * 24 * 60 * 60; // 7 days in seconds

    // Borrower needs to approve collateral
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(borrower).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now try to claim defaulted on a loan that hasn't expired yet
    // The original contract reverts with NoDefault() when block.timestamp <= loan.expiry
    // The mutant replaces the condition with true, so it always reverts
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWith("NoDefault");
  });

  it("should succeed claimDefaulted when loan has expired (mutant incorrectly reverts)", async function () {
    // Setup: borrower creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 1; // 1 second duration for quick expiry

    // Borrower approves and requests loan
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(borrower).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Wait for loan to expire
    await ethers.provider.send("evm_increaseTime", [2]); // increase time beyond 1 second
    await ethers.provider.send("evm_mine", []);

    // For the original contract, claimDefaulted should succeed
    // For the mutant, it will revert with NoDefault() because condition is always true
    // This test will fail on the mutant, thus "killing" it
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.not.be.reverted;

    // Verify collateral was transferred to lender
    const lenderCollateralBalance = await collateralToken.balanceOf(lender.address);
    expect(lenderCollateralBalance).to.equal(collateralAmount);
  });
});