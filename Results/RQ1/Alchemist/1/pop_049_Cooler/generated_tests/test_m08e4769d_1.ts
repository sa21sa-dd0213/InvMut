import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant m08e4769d - collateralFor returns zero", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for testing
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const Factory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await Factory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with collateral and debt tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event or by querying
    const coolerAddress = await coolerFactory.coolerFor(
      owner.address,
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should revert when collateralFor returns zero due to mutant", async function () {
    // Setup: Owner mints collateral and approves cooler to spend it
    const amount = ethers.parseEther("100");
    const loanToCollateral = ethers.parseEther("2"); // 200% collateral ratio
    const expectedCollateral = (amount * BigInt(10 ** 18)) / loanToCollateral;

    await collateralToken.mint(owner.address, amount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), amount);

    // Owner requests a loan
    const interest = ethers.parseEther("0.1");
    const duration = 7 * 24 * 60 * 60; // 7 days

    // If mutant is active, collateralFor returns 0, so safeTransferFrom will try to transfer 0 tokens
    // This will succeed but the collateral balance won't change as expected
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Check the contract's collateral balance - should be expectedCollateral with original code
    // but 0 with mutant since collateralFor returns 0
    const contractBalance = await collateralToken.balanceOf(await cooler.getAddress());
    expect(contractBalance).to.equal(expectedCollateral);
  });
});