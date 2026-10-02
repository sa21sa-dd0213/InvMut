import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m8ec8b286 - collateralFor multiplication vs addition", function () {
  it("should detect mutant by comparing collateralFor calculation with multiplication instead of addition", async function () {
    const [owner, lender] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const collateralToken = await ERC20Factory.deploy("Collateral", "COL", 18);
    await collateralToken.waitForDeployment();
    const debtToken = await ERC20Factory.deploy("Debt", "DEBT", 18);
    await debtToken.waitForDeployment();

    // Deploy CoolerFactory which deploys Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolersFor = await factory.coolersFor(await collateralToken.getAddress(), await debtToken.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);

    // Test parameters
    const amount = ethers.parseEther("100");
    const loanToCollateral = 2n; // 200% LTC

    // Calculate expected value using multiplication (original formula)
    const decimals = await collateralToken.decimals();
    const tenPowDecimals = 10n ** BigInt(decimals);
    const expectedCollateral = (amount * tenPowDecimals) / loanToCollateral;

    // Call collateralFor from the cooler
    const actualCollateral = await cooler.collateralFor(amount, loanToCollateral);

    // If mutant is present (addition), this will fail
    // Original: amount * 10**decimals / loanToCollateral
    // Mutant:   amount + 10**decimals / loanToCollateral
    // For amount=100e18, decimals=18, loanToCollateral=2:
    // Original: 100e18 * 1e18 / 2 = 5e37
    // Mutant:   100e18 + 1e18 / 2 ≈ 100e18 + 5e17 ≈ 100.5e18
    expect(actualCollateral).to.equal(expectedCollateral);
  });
});