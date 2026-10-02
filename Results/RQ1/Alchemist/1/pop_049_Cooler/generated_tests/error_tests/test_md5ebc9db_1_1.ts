import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant md5ebc9db - rollLoan timestamp vs prevrandao", function () {
  it("should revert when rolling a defaulted loan (block.timestamp > loan.expiry), but mutant using block.prevrandao may not revert", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory
    const FactoryFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await FactoryFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress(), 0);
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Owner creates a loan request
    const amount = ethers.parseEther("1000");
    const interest = ethers.parseEther("0.1"); // 10% annual interest
    const loanToCollateral = ethers.parseEther("2"); // 2x collateral
    const duration = 7 * 24 * 60 * 60; // 7 days

    // Owner needs to have collateral tokens
    const collateralAmount = await cooler.collateralFor(amount, loanToCollateral);
    
    // Mint collateral tokens to owner
    await collateralToken._mint(owner.address, collateralAmount);
    await collateralToken.connect(owner).approve(await cooler.getAddress(), collateralAmount);
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Lender clears the request
    await debtToken._mint(lender.address, amount);
    await debtToken.connect(lender).approve(await cooler.getAddress(), amount);
    await cooler.connect(lender).clearRequest(0, false, false);

    // Now fast forward time past the loan expiry
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to roll the loan - should revert because loan is defaulted
    await expect(cooler.connect(owner).rollLoan(0)).to.be.revertedWithCustomError(cooler, "Default");
  });
});