import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant ma93da024 - rescindRequest deactivation check", function () {
  it("should revert when rescinding an already deactivated request", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy required contracts
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const collateral = await ERC20Mock.deploy("Collateral", "COL", 18);
    const debt = await ERC20Mock.deploy("Debt", "DEBT", 18);
    await collateral.waitForDeployment();
    await debt.waitForDeployment();

    // Deploy CoolerFactory (which deploys Cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get cooler implementation address from factory
    const coolerImpl = await factory.coolerImplementation();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address for owner
    const coolerAddress = await factory.coolerFor(owner.address, await collateral.getAddress(), await debt.getAddress());
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner approves collateral transfer to cooler
    const collateralAmount = ethers.parseEther("100");
    await collateral.connect(owner).approve(await cooler.getAddress(), collateralAmount);

    // Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    const tx = await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    await tx.wait();

    // First rescind - should succeed
    const rescindTx = await cooler.connect(owner).rescindRequest(0);
    await rescindTx.wait();

    // Second rescind of the same request - should revert with Deactivated()
    await expect(
      cooler.connect(owner).rescindRequest(0)
    ).to.be.revertedWithCustomError(cooler, "Deactivated");
  });
});