import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant kill test - repayLoan with true condition", function () {
  let cooler: any;
  let factory: any;
  let owner: any;
  let lender: any;
  let collateralToken: any;
  let debtToken: any;

  beforeEach(async function () {
    [owner, lender] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );

    // Get the cooler address
    const coolerAddress = await factory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Fund owner with collateral tokens and approve cooler
    await collateralToken.mint(owner.address, ethers.parseEther("1000"));
    await collateralToken.connect(owner).approve(
      await cooler.getAddress(),
      ethers.parseEther("1000")
    );

    // Create a loan request
    await cooler.connect(owner).requestLoan(
      ethers.parseEther("100"),
      ethers.parseEther("0.1"),
      ethers.parseEther("2"),
      7 * 24 * 60 * 60 // 7 days duration
    );

    // Fund lender with debt tokens and approve cooler
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(
      await cooler.getAddress(),
      ethers.parseEther("1000")
    );

    // Clear the request (create loan)
    await cooler.connect(lender).clearRequest(0, false, false);
  });

  it("should allow repayment before loan expiry", async function () {
    // Get loan details to verify expiry
    const loan = await cooler.getLoan(0);
    const expiry = loan.expiry;

    // Ensure we are before expiry
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    expect(block!.timestamp).to.be.lessThan(Number(expiry));

    // Fund owner with debt tokens for repayment
    await debtToken.mint(owner.address, ethers.parseEther("50"));
    await debtToken.connect(owner).approve(
      await cooler.getAddress(),
      ethers.parseEther("50")
    );

    // Attempt repayment - should succeed in original, fail in mutant
    await cooler.connect(owner).repayLoan(0, ethers.parseEther("50"));

    // Verify the loan was partially repaid
    const updatedLoan = await cooler.getLoan(0);
    expect(updatedLoan.amount).to.be.lessThan(loan.amount);
  });
});