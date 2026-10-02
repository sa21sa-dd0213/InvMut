import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Cooler mutant me90c55de - clearRequest callback validation", function () {
  let cooler: any;
  let coolerFactory: any;
  let collateralToken: any;
  let debtToken: any;
  let owner: any;
  let lender: any;
  let borrower: any;

  beforeEach(async function () {
    [owner, lender, borrower] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const Factory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await Factory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for the borrower with collateral and debt tokens
    const tx = await coolerFactory.connect(borrower).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();
    
    // Get the cooler address from event
    const coolerAddress = receipt.logs[0].address;
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Fund borrower with collateral and approve cooler
    await collateralToken.mint(borrower.address, ethers.parseEther("1000"));
    await collateralToken.connect(borrower).approve(await cooler.getAddress(), ethers.parseEther("1000"));

    // Fund lender with debt tokens and approve cooler
    await debtToken.mint(lender.address, ethers.parseEther("1000"));
    await debtToken.connect(lender).approve(await cooler.getAddress(), ethers.parseEther("1000"));

    // Create a loan request first
    await cooler.connect(borrower).requestLoan(
      ethers.parseEther("100"),
      ethers.parseEther("10"),
      ethers.parseEther("2"),
      30 * 24 * 60 * 60 // 30 days
    );
  });

  it("should revert when clearRequest is called with isCallback_=true from non-callback address", async function () {
    // Try to clear the request with isCallback_=true from lender who is not a CoolerCallback
    await expect(
      cooler.connect(lender).clearRequest(0, false, true)
    ).to.be.revertedWithCustomError(cooler, "NotCoolerCallback");
  });
});