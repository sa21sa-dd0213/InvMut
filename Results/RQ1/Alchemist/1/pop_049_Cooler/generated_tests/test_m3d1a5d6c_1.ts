import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m3d1a5d6c - clearRequest revert Deactivated", function () {
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
    const ERC20 = await ethers.getContractFactory("ERC20");
    collateralToken = await ERC20.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    
    debtToken = await ERC20.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for the owner
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();
    
    // Get the cooler address from the event
    const coolerAddress = await coolerFactory.coolersFor(
      await collateralToken.getAddress(),
      await debtToken.getAddress(),
      0
    );
    cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Mint tokens to owner and lender for testing
    const collateralAmount = ethers.parseEther("1000");
    const debtAmount = ethers.parseEther("10000");
    
    await collateralToken.mint(owner.address, collateralAmount);
    await debtToken.mint(lender.address, debtAmount);
    
    // Approve tokens
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), debtAmount);
  });

  it("should revert when trying to clear an already inactive request", async function () {
    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1"); // 10% interest
    const loanToCollateral = ethers.parseEther("2"); // 2:1 ratio
    const duration = 30 * 24 * 60 * 60; // 30 days

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Get the request ID (should be 0)
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;

    // Lender clears the request (first time - should succeed)
    await cooler.connect(lender).clearRequest(0, false, false);

    // Verify the request is now inactive
    const updatedRequest = await cooler.getRequest(0);
    expect(updatedRequest.active).to.be.false;

    // Attempt to clear the same request again - should revert with Deactivated()
    await expect(
      cooler.connect(lender).clearRequest(0, false, false)
    ).to.be.revertedWith("Deactivated");
  });
});