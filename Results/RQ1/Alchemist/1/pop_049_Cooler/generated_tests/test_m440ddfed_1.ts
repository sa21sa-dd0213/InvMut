import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m440ddfed - rescindRequest access control", function () {
  let coolerFactory: any;
  let cooler: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let collateralToken: any;
  let debtToken: any;
  let coolerAddress: string;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const CoolerFactoryFactory = await ethers.getContractFactory("CoolerFactory");
    coolerFactory = await CoolerFactoryFactory.deploy();
    await coolerFactory.waitForDeployment();

    // Generate a cooler for owner with collateral and debt tokens
    const tx = await coolerFactory.connect(owner).generateCooler(
      await collateralToken.getAddress(),
      await debtToken.getAddress()
    );
    const receipt = await tx.wait();

    // Get the cooler address from the event
    const event = receipt.logs.find((log: any) => {
      try {
        return coolerFactory.interface.parseLog(log);
      } catch {
        return false;
      }
    });
    const parsedEvent = coolerFactory.interface.parseLog(event);
    coolerAddress = parsedEvent.args.cooler;
    cooler = await ethers.getContractAt("Cooler", coolerAddress);
  });

  it("should allow owner to rescind a loan request and fail on mutant where only owner is blocked", async function () {
    // Setup: Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 7 * 24 * 60 * 60; // 7 days

    // First, owner needs to approve and transfer collateral to the cooler
    const collateralForRequest = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(coolerAddress, collateralForRequest);

    // Create the request
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Verify request exists and is active
    const requestBefore = await cooler.getRequest(0);
    expect(requestBefore.active).to.be.true;

    // Owner rescinds the request - this should succeed on original but fail on mutant
    await expect(cooler.connect(owner).rescindRequest(0))
      .to.emit(coolerFactory, "RescindRequest")
      .withArgs(coolerAddress, 0);

    // Verify request is now inactive
    const requestAfter = await cooler.getRequest(0);
    expect(requestAfter.active).to.be.false;

    // Verify collateral was returned to owner
    const ownerBalance = await collateralToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(collateralForRequest);
  });

  it("should revert when non-owner tries to rescind on original but succeed on mutant", async function () {
    // Setup: Owner creates another request
    const amount = ethers.parseEther("50");
    const interest = ethers.parseEther("0.05");
    const loanToCollateral = ethers.parseEther("1.5");
    const duration = 14 * 24 * 60 * 60; // 14 days

    const collateralForRequest = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.connect(owner).approve(coolerAddress, collateralForRequest);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Non-owner tries to rescind - should revert on original but succeed on mutant
    await expect(cooler.connect(addr1).rescindRequest(1)).to.be.revertedWith("OnlyApproved");
  });
});