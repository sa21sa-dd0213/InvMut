import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant mfb8f70a0 - newCollateralFor", function () {
  let coolerFactory: any;
  let cooler: any;
  let collateralToken: any;
  let debtToken: any;
  let owner: any;
  let lender: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Mock.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which creates Cooler instances
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with the tokens
    await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address from the factory
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Setup: Create a loan request and clear it
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    // Calculate required collateral
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);

    // Owner approves and makes a request
    await collateralToken.mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender approves debt tokens and clears the request
    await debtToken.mint(lender.address, amount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);
  });

  it("should return 0 when existing collateral is sufficient for roll", async function () {
    // Get the loan details
    const loan = await cooler.getLoan(0);
    
    // The loan already has collateral that equals what's needed
    // When rolling, newCollateralFor should return 0 since neededCollateral <= loan.collateral
    
    // Verify the initial state
    const initialNewCollateral = await cooler.newCollateralFor(0);
    
    // Since the loan was just created with sufficient collateral, 
    // the newCollateralFor should be 0 (no additional collateral needed)
    expect(initialNewCollateral).to.equal(0);
  });
});