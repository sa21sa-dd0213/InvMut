import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m0435fc3b - isDefaulted timestamp check", function () {
  let cooler: any;
  let factory: any;
  let coolerImplementation: any;
  let owner: any;
  let lender: any;
  let borrower: any;
  let collateral: any;
  let debt: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateral = await ERC20Factory.deploy("Collateral", "COL", 18);
    debt = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const FactoryFactory = await ethers.getContractFactory("CoolerFactory");
    factory = await FactoryFactory.deploy();
    await factory.waitForDeployment();

    // Get the cooler implementation address from factory
    coolerImplementation = await factory.coolerImplementation();

    // Generate a cooler for borrower
    await factory.connect(borrower).generateCooler(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = await factory.coolerFor(borrower.address, await collateral.getAddress(), await debt.getAddress());
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should detect mutant by checking isDefaulted returns correct value based on block.timestamp", async function () {
    // Setup: Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 7 * 24 * 60 * 60; // 7 days in seconds

    // Borrower needs collateral tokens
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    await collateral.mint(borrower.address, collateralAmount);
    await collateral.connect(borrower).approve(await cooler.getAddress(), collateralAmount);

    // Create request
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender needs debt tokens
    await debt.mint(lender.address, amount);
    await debt.connect(lender).approve(await cooler.getAddress(), amount);

    // Clear the request
    await cooler.connect(lender).clearRequest(0, true, false);

    // Initially, loan should not be defaulted
    expect(await cooler.isDefaulted(0)).to.equal(false);

    // Fast forward time past expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    // After time has passed, loan should be defaulted
    // In the mutant, this will use block.prevrandao instead of block.timestamp
    // which will likely return false, killing the mutant
    expect(await cooler.isDefaulted(0)).to.equal(true);
  });
});