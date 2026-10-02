import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant test - collateralFor division vs subtraction", function () {
  it("should correctly calculate collateral using division, not subtraction", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token with 18 decimals to use as collateral
    const MockERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await MockERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();

    const debt = await MockERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Deploy the CoolerFactory which deploys Cooler
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for owner with the collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());

    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];

    // Get the Cooler contract instance
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Test: Use specific values where division result differs from subtraction
    // amount = 1000, loanToCollateral = 2
    // Original: (1000 * 10^18) / 2 = 500 * 10^18
    // Mutant: (1000 * 10^18) - 2 = 999999999999999999998
    const amount = ethers.parseEther("1000");
    const loanToCollateral = 2;

    const result = await cooler.collateralFor(amount, loanToCollateral);

    // Expected result from division: 500 * 10^18
    const expectedResult = ethers.parseEther("500");

    // This assertion will pass on the original (division) but fail on the mutant (subtraction)
    expect(result).to.equal(expectedResult);
  });
});