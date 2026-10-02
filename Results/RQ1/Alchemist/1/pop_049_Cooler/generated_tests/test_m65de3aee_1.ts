import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m65de3aee - rescindRequest", function () {
  it("should allow owner to rescind a request, but mutant always reverts", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy ERC20 mock tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await collateralToken.waitForDeployment();
    await debtToken.waitForDeployment();

    // Deploy the CoolerFactory
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolerFor(owner.address, await collateralToken.getAddress(), await debtToken.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("10");
    const loanToCollateral = 2000; // 2000% LTC
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Owner needs to have collateral tokens to deposit
    const collateralNeeded = await cooler.collateralFor(amount, loanToCollateral);
    await collateralToken.mint(owner.address, collateralNeeded);
    await collateralToken.connect(owner).approve(coolerAddress, collateralNeeded);

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Verify the request exists and is active
    const request = await cooler.getRequest(0);
    expect(request.active).to.be.true;

    // Now test rescindRequest: owner should be able to rescind
    // In the mutant, this will always revert because condition is replaced with `true`
    await expect(
      cooler.connect(owner).rescindRequest(0)
    ).to.not.be.reverted;

    // Verify the request is now inactive
    const updatedRequest = await cooler.getRequest(0);
    expect(updatedRequest.active).to.be.false;
  });
});