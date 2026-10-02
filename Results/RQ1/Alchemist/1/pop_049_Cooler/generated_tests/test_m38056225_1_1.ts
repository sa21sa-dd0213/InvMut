import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - clearRequest timestamp multiplication", function () {
  let coolerFactory: any;
  let coolerImplementation: any;
  let cooler: any;
  let collateralToken: any;
  let debtToken: any;
  let owner: any;
  let lender: any;
  let borrower: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Mock.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for borrower
    const tx = await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const coolerAddress = receipt.logs[0].args?.cooler || 
      (await coolerFactory.coolersFor(
        await collateralToken.getAddress(),
        await debtToken.getAddress(),
        0
      ));
      
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Mint tokens to borrower for collateral
    const collateralAmount = ethers.parseEther("1000");
    await collateralToken.mint(borrower.address, collateralAmount);
    await collateralToken.connect(borrower).approve(coolerAddress, collateralAmount);

    // Mint tokens to lender for debt
    const debtAmount = ethers.parseEther("1000");
    await debtToken.mint(lender.address, debtAmount);
    await debtToken.connect(lender).approve(coolerAddress, debtAmount);
  });

  it("should revert on claimDefaulted when expiration uses multiplication instead of addition", async function () {
    // Create a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.05"); // 5% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 3600; // 1 hour

    // Borrower requests loan
    await cooler.connect(borrower).requestLoan(amount, interest, loanToCollateral, duration);

    // Clear the request (lender provides the loan)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Fast forward time to after the loan would have expired
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    // Try to claim defaulted - this should succeed in the original but fail in the mutant
    // because block.timestamp * duration creates an astronomically large expiration
    await expect(
      cooler.connect(lender).claimDefaulted(0)
    ).to.be.revertedWith("NoDefault");
  });
});