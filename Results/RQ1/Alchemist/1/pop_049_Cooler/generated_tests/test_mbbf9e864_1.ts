import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mbbf9e864 - rollLoan callback", function () {
  it("should invoke onRoll callback when loan has callback enabled", async function () {
    const [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerCallback mock that records calls
    const CallbackFactory = await ethers.getContractFactory("CoolerCallbackMock");
    const callbackContract = await CallbackFactory.deploy();
    await callbackContract.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get the Cooler implementation address from factory
    const coolerImpl = await factory.coolerImplementation();

    // Generate cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Mint collateral to owner and approve cooler
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Mint debt to lender and approve cooler
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(coolerAddress, amount);

    // Clear the request with callback enabled
    const tx = await cooler.connect(lender).clearRequest(0, false, true);
    await tx.wait();

    // Now roll the loan - owner provides new collateral
    const loan = await cooler.getLoan(0);
    const newCollateral = await cooler.newCollateralFor(0);
    
    if (newCollateral > 0n) {
      await collateral.mint(owner.address, newCollateral);
      await collateral.connect(owner).approve(coolerAddress, newCollateral);
    }

    // Call rollLoan - this should trigger the callback
    const rollTx = await cooler.connect(owner).rollLoan(0);
    await rollTx.wait();

    // Verify that the callback was called on the lender's callback contract
    const callbackCalled = await callbackContract.onRollCalled();
    expect(callbackCalled).to.equal(true);
    
    // Also verify the callback parameters if possible
    const lastLoanId = await callbackContract.lastLoanId();
    expect(lastLoanId).to.equal(0);
  });
});